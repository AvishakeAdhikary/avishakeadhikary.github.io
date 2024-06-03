import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Avishake's Portfolio",
  description: "Avishake Adhikary - Machine Learning Engineer | Full Stack Developer | Explore the dynamic portfolio of Avishake Adhikary, a proficient Machine Learning Engineer and Full Stack Developer based in Kolkata, India. With a strong foundation in Java, JavaScript, Python, and more, Avishake specializes in crafting innovative solutions that blend cutting-edge technology with user-centric design. Discover his expertise in AI, web development, and cloud computing through hands-on projects and professional experiences. Get in touch to collaborate on transformative tech ventures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
