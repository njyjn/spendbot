import Navigation from "./navigation";
import Footer from "./footer";
import { PropsWithChildren } from "react";
import { Container } from "react-bootstrap";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <Container fluid>
      <Navigation />
      <main>{children}</main>
      <Footer />
    </Container>
  );
}
