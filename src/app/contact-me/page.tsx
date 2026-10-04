import type { Metadata } from "next";
import ContactPage from "../contact/page";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact/" },
};

/** Legacy URL kept alive; canonical is /contact/. */
export default ContactPage;
