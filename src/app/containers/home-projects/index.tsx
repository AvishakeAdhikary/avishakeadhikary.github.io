import { HeroParallax } from "@/app/components/ui/hero-parallax";

const parallaxProjects = [
    {
      title: "First React Robot Generator",
      link: "https://github.com/AvishakeAdhikary/FirstReactRobotGenerator",
      thumbnail: "/images/projects/firstreactrobotgenerator.png"
    },
    {
      title: "Health Application",
      link: "https://github.com/AvishakeAdhikary/HealthApp",
      thumbnail: "/images/projects/HealthApp.png"
    },
    {
      title: "3D Portfolio",
      link: "https://github.com/AvishakeAdhikary/3D-Portfolio",
      thumbnail: "/images/projects/3dportfolio.png"
    },
    {
      title: "OS Portfolio",
      link: "https://avishakeadhikary.github.io/OS-Portfolio/",
      thumbnail: "/images/projects/osportfolio.png"
    },
    {
      title: "My Flutter Card",
      link: "https://github.com/AvishakeAdhikary/My_Flutter_Card",
      thumbnail: "/images/projects/fluttercard.png"
    },
    {
      title: "Python Code Generator",
      link: "https://github.com/AvishakeAdhikary/Python-Code-Generator",
      thumbnail: "/images/projects/pcg.png"
    },
    {
      title: "Neural Networks from Scratch",
      link: "https://github.com/AvishakeAdhikary/Neural-Networks-From-Scratch",
      thumbnail: "/images/projects/NNFS_GitHub_Banner.gif"
    },
    {
      title: "KoyoX",
      link: "https://koyoxai.azurewebsites.net/",
      thumbnail: "/images/projects/KoyoX.png"
    },
    {
      title: "Realtime-Sign-Language-Detection-Using-LSTM-Model",
      link: "https://github.com/AvishakeAdhikary/Realtime-Sign-Language-Detection-Using-LSTM-Model",
      thumbnail: "/images/projects/rtsldlm.png"
    },
    {
      title: "Text to Image Generator",
      link: "https://github.com/AvishakeAdhikary/Text-To-Image-Generator",
      thumbnail: "/images/projects/texttoimage.jpg"
    },
    {
      title: "Realtime-Sign-Language-Detection-Using-React.js",
      link: "https://github.com/AvishakeAdhikary/Realtime-Sign-Language-Detection-Using-React.js",
      thumbnail: "/images/projects/rtsldr.png"
    },
    {
      title: "Python Code Generator",
      link: "https://github.com/AvishakeAdhikary/Python-Code-Generator",
      thumbnail: "/images/projects/pcg.png"
    },
    {
      title: "AI-Job-Assistant-ChatApp",
      link: "https://github.com/AvishakeAdhikary/AI-Job-Assistant-ChatApp",
      thumbnail: "/images/projects/aiassistantchatapp.png"
    },
    {
      title: "Face Recognition Flutter",
      link: "https://github.com/AvishakeAdhikary/FaceRecognitionFlutter",
      thumbnail: "/images/projects/frf.png"
    },
    {
      title: "Text to Image Generator",
      link: "https://github.com/AvishakeAdhikary/Text-To-Image-Generator",
      thumbnail: "/images/projects/texttoimage.jpg"
    }
];

export default function ProjectsParallax () {
    return (
        <HeroParallax products={parallaxProjects} />
    );
}