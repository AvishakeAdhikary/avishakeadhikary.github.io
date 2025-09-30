import React from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Image from "next/image";
import Link from "next/link";
import { PinContainer } from "@/components/ui/3d-pin";
import { skills } from "../../../../../public/data/skills";

export default function SkillsBody() {
  return (
    <div className="w-full flex flex-wrap justify-evenly">
      {skills.map((item, i) => (
        <div key={i}>
          <br /><br />
          <PinContainer
            title={item.name}
          >
            <div className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 sm:basis-1/2 w-[20rem] h-[20rem] ">
              <h3 className="max-w-xs !pb-2 !m-0 font-bold text-base text-slate-100">
                {item.name}
              </h3>
              <div className="text-base !m-0 !p-0 font-normal">
                <span className="text-slate-500">
                  {item.designation}
                </span>
              </div>
              <div className="flex flex-1 w-full rounded-lg mt-4 justify-center">
                <Image src={item.image} height={150} width={150} alt={item.name} />
              </div>
            </div>
          </PinContainer>
        </div>
      ))}
    </div>
  );
}
