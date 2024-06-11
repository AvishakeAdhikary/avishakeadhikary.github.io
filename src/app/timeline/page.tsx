import HomeButton from "../components/ui/home-button";
import TimelineBody from "../containers/(timeline)/timeline-body/TimelineBody";
import { TimelineHeader } from "../containers/(timeline)/timeline-header/TimelineHeader";


export default function Timeline(){
    return (
        <>
            <TimelineHeader />
            <TimelineBody />
            <HomeButton />
        </>
    )
}