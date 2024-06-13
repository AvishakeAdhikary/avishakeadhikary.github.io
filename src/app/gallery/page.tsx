import HomeButton from "../components/ui/home-button";
import ResumeDownloadButton from "../components/ui/resume-download-button";
import GalleryBody from "../containers/(gallery)/gallery-body";
import GalleryHeader from "../containers/(gallery)/gallery-header";

export default function Gallery(){
    return (
        <>
            <HomeButton />
            <GalleryHeader />
            <GalleryBody />
            <ResumeDownloadButton />
        </>
    );
}