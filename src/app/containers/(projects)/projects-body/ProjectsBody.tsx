"use client";
import React from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Image from "next/image";
import Link from "next/link";
import { projects } from "../../../../../public/data/projects";


export default function ProjectsBody() {
  return (
    <div className="w-full flex flex-wrap justify-evenly">
      {projects.map((item, i) => (
        <CardContainer key={i} className="inter-var">
          <CardBody className="group/card relative w-auto sm:w-[30rem] h-auto rounded-xl p-6 hover:shadow-2xl hover:shadow-emerald-500/[0.2] border-white border">
            <CardItem translateZ="50" className="text-xl font-bold">{item.title}</CardItem>  
            <CardItem translateZ="100" className="w-full mt-4">
              <Image src={item.thumbnail} height="1000" width="1000" className="h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl" alt="thumbnail" />
            </CardItem>
            <div className="flex justify-center items-center mt-20">
              <Link href={item.link}>
                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl bg-gray-50 text-black text-xs font-bold">Explore Project</CardItem>
              </Link>
            </div>
          </CardBody>
        </CardContainer>
      ))}
    </div>
  );
}