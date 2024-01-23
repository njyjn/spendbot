import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Navigation() {
  const { user, error, isLoading } = useUser();
  const { locale, locales, route } = useRouter();
  const otherLocale = locales?.find((cur) => cur !== locale);

  const t = useTranslations("Navigation");

  return (
    <Navbar collapseOnSelect expand="md">
      <Container fluid>
        <Link href="/" locale={locale} className="navbar-brand">
          💸 SpendBot
        </Link>
        <Navbar.Toggle aria-controls="responsive-navbar-nav"></Navbar.Toggle>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Link href="/overview" locale={locale} className="nav-link">
              💰 {t("networth")}
            </Link>
            <Link href="/summary" locale={locale} className="nav-link">
              📊 {t("summary")}
            </Link>
            <Link href="/add" locale={locale} className="nav-link">
              🧮 {t("add")}
            </Link>
            <Link href="/god" locale={locale} className="nav-link">
              🌈 {t("god")}
            </Link>
          </Nav>
          <Nav>
            {user ? (
              <NavDropdown
                title={`👋 ${t("hello")}, ${user.name}!`}
                id="collapsible-nav-dropdown"
              >
                <NavDropdown.Item>
                  <Link
                    href="/api/auth/logout"
                    locale={locale}
                    className="nav-link"
                  >
                    🌚 {t("logout")}
                  </Link>
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Link
                href="/api/auth/login"
                locale={locale}
                className={"nav-link"}
              >
                🌞 {t("login")}
              </Link>
            )}
            <Link href={route} locale={otherLocale} className="nav-link">
              {t("locale", { locale: otherLocale })}
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

Navigation.messages = ["Navigation"];
