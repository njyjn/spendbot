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
        <Navbar.Brand href="/spend">💸 SpendBot</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav"></Navbar.Toggle>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/spend/overview">💰 {t("networth")}</Nav.Link>
            <Nav.Link href="/spend/summary">📊 {t("summary")}</Nav.Link>
            <Nav.Link href="/spend/add">🧮 {t("add")}</Nav.Link>
            <Nav.Link href="/spend/god">🌈 {t("god")}</Nav.Link>
          </Nav>
          <Nav>
            {user ? (
              <NavDropdown
                title={`👋 ${t("hello")}, ${user.name}!`}
                id="collapsible-nav-dropdown"
              >
                <NavDropdown.Item href="/spend/api/auth/logout">
                  🌚 {t("logout")}
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link href="/spend/api/auth/login">🌞 {t("login")}</Nav.Link>
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
