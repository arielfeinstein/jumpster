import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./auth.module.css";

export default function RegisterPage() {
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
    const username = (form.elements.namedItem("username") as HTMLInputElement)
      .value;

    // Create the user account via our API route (which uses the admin client
    // to create both the auth user and the profile row atomically).
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    // Account created — sign in immediately so the user has an active session.
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
        <h1 className={styles.title}>Create account</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} name="username" type="text" placeholder="Username" required />
          <input className={styles.input} name="email" type="email" placeholder="Email" required />
          <input className={styles.input} name="password" type="password" placeholder="Password" minLength={6} required />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className={styles.footer}>Already have an account? <Link href="/login">Log in</Link></p>
      </div>
    </div>
  );
}
