use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("AtuWY477e3GQTivKcwK2UAdxtFeSMZKNFWtYtaKh1u6F");

#[program]
pub mod gas_deployment {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        test_gas_mint: Pubkey,
        war_chest_authority: Pubkey,
    ) -> Result<()> {
        require!(test_gas_mint != Pubkey::default(), DeploymentError::InvalidMint);
        require!(war_chest_authority != Pubkey::default(), DeploymentError::InvalidWarChest);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.test_gas_mint = test_gas_mint;
        config.war_chest_authority = war_chest_authority;
        config.current_epoch = 0;
        config.paused = false;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn initialize_epoch(
        ctx: Context<InitializeEpoch>,
        epoch_number: u64,
        start_timestamp: i64,
        end_timestamp: i64,
        deployment_cost_gas: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, DeploymentError::ProgramPaused);
        require!(epoch_number > ctx.accounts.config.current_epoch, DeploymentError::InvalidEpochNumber);
        require!(start_timestamp < end_timestamp, DeploymentError::InvalidEpochWindow);
        require!(deployment_cost_gas > 0, DeploymentError::InvalidDeploymentCost);

        let epoch = &mut ctx.accounts.epoch;
        epoch.epoch_number = epoch_number;
        epoch.start_timestamp = start_timestamp;
        epoch.end_timestamp = end_timestamp;
        epoch.deployment_cost_gas = deployment_cost_gas;
        epoch.total_deployed = 0;
        epoch.status = EpochStatus::Open;
        epoch.bump = ctx.bumps.epoch;
        ctx.accounts.config.current_epoch = epoch_number;
        Ok(())
    }

    pub fn deploy_nft(ctx: Context<DeployNft>) -> Result<()> {
        let clock = Clock::get()?;
        let config = &ctx.accounts.config;
        let epoch = &mut ctx.accounts.epoch;
        require!(!config.paused, DeploymentError::ProgramPaused);
        require!(epoch.status == EpochStatus::Open, DeploymentError::EpochClosed);
        require!(clock.unix_timestamp >= epoch.start_timestamp, DeploymentError::EpochNotStarted);
        require!(clock.unix_timestamp <= epoch.end_timestamp, DeploymentError::EpochEnded);

        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.payer_gas_account.to_account_info(),
                    mint: ctx.accounts.test_gas_mint.to_account_info(),
                    to: ctx.accounts.war_chest_gas_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            epoch.deployment_cost_gas,
            ctx.accounts.test_gas_mint.decimals,
        )?;

        let deployment = &mut ctx.accounts.deployment;
        deployment.epoch_number = epoch.epoch_number;
        deployment.nft_mint = ctx.accounts.nft_mint.key();
        deployment.payer_wallet = ctx.accounts.payer.key();
        deployment.deployed_at = clock.unix_timestamp;
        deployment.gas_amount_paid = epoch.deployment_cost_gas;
        deployment.bump = ctx.bumps.deployment;
        epoch.total_deployed = epoch.total_deployed.checked_add(1).ok_or(DeploymentError::MathOverflow)?;
        Ok(())
    }

    pub fn close_epoch(ctx: Context<ManageEpoch>, _epoch_number: u64) -> Result<()> {
        require!(ctx.accounts.epoch.status == EpochStatus::Open, DeploymentError::EpochClosed);
        ctx.accounts.epoch.status = EpochStatus::Closed;
        Ok(())
    }

    pub fn set_paused(ctx: Context<UpdateConfig>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }
}
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = DeploymentConfig::SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, DeploymentConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(epoch_number: u64)]
pub struct InitializeEpoch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = authority @ DeploymentError::Unauthorized)]
    pub config: Account<'info, DeploymentConfig>,
    #[account(init, payer = authority, space = DeploymentEpoch::SPACE, seeds = [b"epoch", epoch_number.to_le_bytes().as_ref()], bump)]
    pub epoch: Account<'info, DeploymentEpoch>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeployNft<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, DeploymentConfig>,
    #[account(mut, seeds = [b"epoch", epoch.epoch_number.to_le_bytes().as_ref()], bump = epoch.bump, constraint = epoch.epoch_number == config.current_epoch @ DeploymentError::WrongEpoch)]
    pub epoch: Account<'info, DeploymentEpoch>,
    #[account(init, payer = payer, space = DeploymentRecord::SPACE, seeds = [b"deployment", epoch.epoch_number.to_le_bytes().as_ref(), nft_mint.key().as_ref()], bump)]
    pub deployment: Account<'info, DeploymentRecord>,
    /// CHECK: Mainnet ownership cannot be proven by this Devnet test program. The mint is only a stable record key.
    pub nft_mint: UncheckedAccount<'info>,
    #[account(address = config.test_gas_mint @ DeploymentError::InvalidMint)]
    pub test_gas_mint: Account<'info, Mint>,
    #[account(mut, token::mint = test_gas_mint, token::authority = payer)]
    pub payer_gas_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = test_gas_mint, token::authority = config.war_chest_authority @ DeploymentError::InvalidWarChest)]
    pub war_chest_gas_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(epoch_number: u64)]
pub struct ManageEpoch<'info> {
    pub authority: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump, has_one = authority @ DeploymentError::Unauthorized)]
    pub config: Account<'info, DeploymentConfig>,
    #[account(mut, seeds = [b"epoch", epoch_number.to_le_bytes().as_ref()], bump = epoch.bump)]
    pub epoch: Account<'info, DeploymentEpoch>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = authority @ DeploymentError::Unauthorized)]
    pub config: Account<'info, DeploymentConfig>,
}

#[account]
pub struct DeploymentConfig {
    pub authority: Pubkey,
    pub test_gas_mint: Pubkey,
    pub war_chest_authority: Pubkey,
    pub current_epoch: u64,
    pub paused: bool,
    pub bump: u8,
}
impl DeploymentConfig { pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1; }

#[account]
pub struct DeploymentEpoch {
    pub epoch_number: u64,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    /// Raw smallest-token units, transferred with transfer_checked.
    pub deployment_cost_gas: u64,
    pub total_deployed: u64,
    pub status: EpochStatus,
    pub bump: u8,
}
impl DeploymentEpoch { pub const SPACE: usize = 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1; }

#[account]
pub struct DeploymentRecord {
    pub epoch_number: u64,
    pub nft_mint: Pubkey,
    /// Historical payer metadata only; entitlement is keyed by epoch + NFT mint.
    pub payer_wallet: Pubkey,
    pub deployed_at: i64,
    pub gas_amount_paid: u64,
    pub bump: u8,
}
impl DeploymentRecord { pub const SPACE: usize = 8 + 8 + 32 + 32 + 8 + 8 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EpochStatus { Open, Closed }

#[error_code]
pub enum DeploymentError {
    #[msg("Authority is not permitted to perform this action.")] Unauthorized,
    #[msg("The deployment program is paused.")] ProgramPaused,
    #[msg("The epoch is closed.")] EpochClosed,
    #[msg("The epoch has not started.")] EpochNotStarted,
    #[msg("The epoch has ended.")] EpochEnded,
    #[msg("The requested epoch is not current.")] WrongEpoch,
    #[msg("Epoch number must increase.")] InvalidEpochNumber,
    #[msg("Epoch start must be before epoch end.")] InvalidEpochWindow,
    #[msg("Deployment cost must be greater than zero.")] InvalidDeploymentCost,
    #[msg("The TEST $GAS mint is invalid.")] InvalidMint,
    #[msg("The TEST War Chest token account is invalid.")] InvalidWarChest,
    #[msg("Arithmetic overflow.")] MathOverflow,
}
