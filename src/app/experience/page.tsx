import type { Metadata } from "next";
import WorkPage from "../work/page";

export const metadata: Metadata = {
  title: "Work",
  alternates: { canonical: "/work/" },
};

/** Legacy URL kept alive; canonical is /work/. */
export default WorkPage;
