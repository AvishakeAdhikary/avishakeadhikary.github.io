"use client";
import React from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Image from "next/image";
import Link from "next/link";
import { projects } from "../../../../../public/data/projects";


export default function ProjectsBody() {
  return (
    <div className="w-full flex flex-wrap justify-center gap-4 px-4 py-8">
      {projects.map((item, i) => (
        <CardContainer key={i} className="inter-var">
          <CardBody className="group/card relative w-full max-w-[28rem] sm:w-[30rem] h-auto rounded-xl p-4 sm:p-6 hover:shadow-2xl hover:shadow-red-600/[0.25] border-white border bg-black">
            <CardItem translateZ="50" className="text-lg sm:text-xl font-bold text-white">
              {item.title}
            </CardItem>
            <CardItem translateZ="100" className="w-full mt-4">
              <Image
                src={item.thumbnail}
                height={1000}
                width={1000}
                className="h-48 sm:h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl"
                alt={item.title}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, 480px"
              />
            </CardItem>
            <div className="flex justify-center items-center mt-12 sm:mt-20">
              <Link href={item.link} aria-label={`Explore ${item.title}`}>
                <CardItem
                  translateZ={20}
                  as="button"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  Explore Project
                </CardItem>
              </Link>
            </div>
          </CardBody>
        </CardContainer>
      ))}
    </div>
  );
}
