import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    // Supabase handles credential verification and sets a session cookie.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Jumpster" className={styles.logo} />
        <h1 className={styles.title}>Log in</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} name="email" type="email" placeholder="Email" required />
          <input className={styles.input} name="password" type="password" placeholder="Password" required />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className={styles.footer}>No account? <Link href="/register">Register</Link></p>
      </div>
    </div>
  );
}
