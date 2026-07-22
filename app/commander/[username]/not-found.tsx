/* eslint-disable @next/next/no-img-element -- local GAS branding is rendered directly. */

import Link from "next/link";
import { Header, Footer } from "@/components/LandingPage";
import styles from "./CommanderProfile.module.css";

export default function CommanderNotFound() {
  return <main className={styles.publicPage}><Header /><section className={styles.fileState}><img src="/logo.png" alt="" /><span>GAS PERSONNEL ARCHIVE</span><h1>COMMANDER FILE NOT FOUND</h1><p>This dossier does not exist or has been withdrawn from the public archive.</p><Link href="/">RETURN TO BASE</Link></section><Footer /></main>;
}
