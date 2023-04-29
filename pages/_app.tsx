import "@/styles/globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import type { AppProps } from "next/app";
import { UserProvider } from "@auth0/nextjs-auth0/client";

import Layout from "../components/layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider
      loginUrl="/spend/api/auth/login"
      profileUrl="/spend/api/auth/me"
    >
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  );
}
