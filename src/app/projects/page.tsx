import HomeButton from "../components/ui/home-button";
import ResumeDownloadButton from "../components/ui/resume-download-button";
import ProjectsBody from "../containers/(projects)/projects-body/ProjectsBody";
import ProjectHeader from "../containers/(projects)/projects-header/ProjectHeader";

export default function Projects() {
  return (
    <>
        <HomeButton />
        <ProjectHeader />
        <ProjectsBody />
        <ResumeDownloadButton />
    </>
  );
}
