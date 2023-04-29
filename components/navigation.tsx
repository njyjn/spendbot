import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function Navigation() {
  const { user, error, isLoading } = useUser();

  return (
    <Navbar collapseOnSelect expand="md">
      <Container fluid>
        <Navbar.Brand href="/spend">SpendBot</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav"></Navbar.Toggle>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/spend/summary">Сводка</Nav.Link>
            <Nav.Link href="/spend/add">Добавить</Nav.Link>
          </Nav>
          <Nav>
            {user ? (
              <NavDropdown
                title={"Привет, " + user.name + "!"}
                id="collapsible-nav-dropdown"
              >
                <NavDropdown.Item href="/spend/api/auth/logout">
                  Выйти
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link href="/spend/api/auth/login">Войти</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
