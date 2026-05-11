import { Redirect } from 'expo-router';

// OAuth handles both sign-in and sign-up — no separate email sign-up flow.
export default function SignUp() {
  return <Redirect href="/(auth)/sign-in" />;
}
