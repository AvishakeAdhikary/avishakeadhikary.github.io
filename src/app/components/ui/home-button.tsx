"use client";
import React from "react";
import { HoverBorderGradient } from "./hover-border-gradient";
import Image from "next/image";
import Link from "next/link";

export default function HomeButton() {
  return (
    <div className="fixed top-0 left-0 p-2 z-50" style={{zIndex: 10000}}>
        <Link href={"/"}>
            <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                className="flex items-center space-x-2"
            >
                <Image src={"/images/icons/home.svg"} alt={"Home"} width={20} height={20}/>
            </HoverBorderGradient>
        </Link>
    </div>
  );
}
