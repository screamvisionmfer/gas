import { strict as assert } from "node:assert";
import {
  claimLocalPayroll,
  closeLocalEpoch,
  createLocalPayrollSimulation,
  deployLocalSoldiers,
  estimatedWalletPayroll,
  startNextLocalEpoch,
  updateLocalEconomy,
} from "../lib/commander-payroll-local";

describe("Commander Payroll local economic simulation", () => {
  it("runs deploy, estimate, close, claim, next epoch, and persistent War Chest flow", () => {
    const soldiers = ["NFT-1", "NFT-2", "NFT-3", "NFT-4", "NFT-5"];
    let state = createLocalPayrollSimulation();

    state = deployLocalSoldiers(state, soldiers);
    assert.equal(state.deployedSoldierMints.length, 5);
    assert.equal(state.warChestGas, 500);
    assert.ok(estimatedWalletPayroll(state) > 0);

    state = updateLocalEconomy(state, 10, 100);
    assert.equal(estimatedWalletPayroll(state), 0.5);

    state = closeLocalEpoch(state);
    assert.equal(state.status, "closed");
    assert.equal(state.finalEntitlementSol, 0.5);
    assert.equal(state.history.length, 1);

    state = updateLocalEconomy(state, 99, 777);
    assert.equal(state.finalEntitlementSol, 0.5);
    assert.equal(state.payrollPoolSol, 10);

    state = claimLocalPayroll(state);
    assert.equal(state.claimed, true);
    assert.equal(state.claimedAmountSol, 0.5);
    const afterSecondClaim = claimLocalPayroll(state);
    assert.deepEqual(afterSecondClaim, state);

    state = startNextLocalEpoch(state);
    assert.equal(state.currentEpoch, 2);
    assert.equal(state.deployedSoldierMints.length, 0);
    assert.equal(state.warChestGas, 500);
    assert.equal(state.history[0].claimed, true);

    state = deployLocalSoldiers(state, soldiers);
    assert.equal(state.deployedSoldierMints.length, 5);
    assert.equal(state.warChestGas, 1000);
    assert.equal(state.history[0].epochNumber, 1);
  });
});
