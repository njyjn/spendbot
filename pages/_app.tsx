import "@/styles/globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import type { AppProps } from "next/app";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";

import { UserProvider } from "@auth0/nextjs-auth0/client";

import Layout from "../components/layout";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return (
    <UserProvider
      loginUrl="/spend/api/auth/login"
      profileUrl="/spend/api/auth/me"
    >
      <NextIntlClientProvider
        locale={router.locale}
        timeZone="Asia/Singapore"
        messages={pageProps.messages}
      >
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </NextIntlClientProvider>
    </UserProvider>
  );
}
