import type { Degree, Honor, Role } from "./types";

/**
 * Minion Technologies is Avishake's current employer. While he works there the
 * site shows `minionPublic`: his skills and the kinds of systems he builds,
 * without employer-internal details (metrics, file counts, hardware and cloud
 * setup, techniques, security and validation steps). The full write-up from
 * cv.md is kept, unpublished, in `minionDetailed`.
 *
 * Publish the detailed version only when Avishake explicitly decides to: set
 * MINION_DETAIL_PUBLIC to true, together with `public: true` on the four
 * Minion projects in src/content/projects.ts.
 */
const MINION_DETAIL_PUBLIC = false;

type RoleText = Pick<Role, "summary" | "highlights" | "skills">;

const minionPublic: RoleText = {
  summary:
    "Building production AI for ZoyeMed, an autonomous medical-kiosk and healthcare platform deployed internationally: fine-tuning and quantizing LLMs for on-device and edge inference, multimodal and voice conversational AI, retrieval over medical knowledge, agentic tool-calling workflows and computer vision, through to the Python services and hardware integration that run them in production.",
  highlights: [
    "Fine-tune open-weight LLMs (MedGemma, Qwen, Gemma, DeepSeek R1, GPT-OSS) with PyTorch, LoRA/QLoRA and Unsloth, and quantize them (including MXFP4) for efficient on-device and edge inference with llama.cpp and vLLM on NVIDIA and AMD ROCm GPUs.",
    "Build real-time voice and text conversational AI for clinical decision support, combining multimodal reasoning with tool calling across doctor, nurse and patient workflows.",
    "Retrieval-augmented generation (RAG) over public medical and regulatory knowledge bases such as OpenFDA and ICD-11, plus multilingual medical-data processing and LOINC terminology mapping.",
    "Distributed multi-GPU training with PyTorch DDP on HPC infrastructure.",
    "Multimodal document understanding with vision-language models, including privacy-preserving preparation of medical data for model training.",
    "Agentic AI workflows with LLM tool calling for business automation: lead discovery and scoring, organizational research, personalized email and SEO content generation.",
    "Computer vision for face detection and tracking with PTZ camera control, supporting automated patient-examination workflows.",
    "Production Python AI backends integrated with React/Electron applications, Docker and Spring Boot services, on Linux/Ubuntu kiosk systems with Bluetooth/USB medical-device and hardware integration.",
  ],
  skills: ["PyTorch", "LoRA/QLoRA", "Unsloth", "llama.cpp", "vLLM", "Quantization", "ROCm", "RAG", "Agentic AI", "Vision-language models", "DDP", "Computer Vision", "Docker", "Electron", "Spring Boot"],
};

/** The full Minion write-up (cv.md). Unpublished while employed there; see above. */
export const minionDetailed: RoleText = {
  summary:
    "Designing, building and deploying production AI for ZoyeMed, an autonomous medical-kiosk and healthcare platform combining LLMs, multimodal AI, medical devices, edge computing, telemedicine and computer vision, deployed across international markets on on-device inference and Scaleway cloud.",
  highlights: [
    "Fine-tune and quantize LLMs (MedGemma, Qwen, DeepSeek R1, Gemma, GPT-OSS) with PyTorch, LoRA/QLoRA, Unsloth and llama.cpp; optimized MedGemma-27B-IT with MXFP4 precision on NVIDIA Blackwell and ROCm hardware for edge inference.",
    "Architected an on-prem medical-record de-identification pipeline that turns hospital archives into MedGemma training corpora: provider-agnostic multimodal page reading, PHI removal from text and scans via fractional rotated zonal masking, automated leak verification, AES-256 packaging with SHA-256 manifests. Zero surviving identifiers on validation.",
    "Scaled it to multi-terabyte archives: data-driven redaction entities eliminating O(patients × pages) matching, header-only ZIP sniffing ~20× faster than decompression across 11,631 files, and checkpointed, resumable stages.",
    "Distributed training with DDP across multi-GPU HPC infrastructure.",
    "Real-time voice and text conversational AI for clinical decision support with multimodal reasoning and tool calling, across Doctor, Nurse and Patient roles.",
    "RAG over OpenFDA and ICD-11 knowledge bases, improving retrieval latency and performance by 30%.",
    "Agentic CRM automation: lead discovery and scoring, organizational research, personalized email and SEO content generation.",
    "PTZ-camera face detection and tracking for automated patient identification and examination workflows.",
    "Python AI backends integrated with React/Electron, Docker and Spring Boot; Ubuntu kiosk enforcement, hardware validation tooling and Bluetooth/USB device integration.",
  ],
  skills: ["PyTorch", "LoRA/QLoRA", "Unsloth", "llama.cpp", "vLLM", "ROCm", "RAG", "DDP", "Computer Vision", "Docker", "Electron"],
};

/**
 * Work history, newest first. Dates follow LinkedIn; wording follows cv.md.
 *
 * Note: LinkedIn also lists a one-month "DIGITYS" role (Jan 2024). PTS
 * Consulting Services renamed itself to DIGITYS internally; there is no
 * separate signed record, so it is folded into the PTS role (through Jan 2024).
 */
export const roles: Role[] = [
  {
    id: "minion",
    kind: "work",
    org: "Minion Technologies",
    short: "Minion",
    title: "Machine Learning Engineer",
    employment: "Full-time",
    start: "2025-06",
    end: null,
    location: "Kolkata, India · On-site",
    ...(MINION_DETAIL_PUBLIC ? minionDetailed : minionPublic),
  },
  {
    id: "bvb",
    kind: "work",
    org: "Bharatiya Vidya Bhavan Institute of Management Science",
    short: "BVB",
    title: "Computer Science Teacher",
    employment: "Part-time",
    start: "2025-02",
    end: "2025-05",
    location: "Kolkata, India · On-site",
    summary:
      "Taught Adobe Photoshop, Illustrator and SQL to 50+ BBA students through structured lab instruction.",
    highlights: [
      "Designed and delivered lesson plans combining visual communication and data-management best practice.",
      "Graded assignments, projects and exams with constructive feedback.",
      "Conducted WBJEE invigilation for the 2025–26 cohort.",
    ],
    skills: ["SQL", "MySQL", "Photoshop", "Illustrator", "Teaching"],
  },
  {
    id: "pts",
    kind: "work",
    org: "PTS Consulting Services",
    short: "PTS",
    title: "Machine Learning Engineer | Graduate Engineer",
    employment: "Full-time",
    start: "2023-08",
    end: "2024-01",
    location: "Kolkata, India · On-site",
    stages: [
      { title: "Graduate Engineer · Machine Learning Engineer", start: "2023-09", end: "2024-01" },
      {
        title: "Graduate Engineer Trainee",
        start: "2023-08",
        end: "2023-09",
        note: "Topped every trainee assessment: databases, Java full stack (Angular, Spring Boot), GCP/Azure/AWS, Power BI and Tableau.",
      },
    ],
    summary:
      "Delivered ML and full-stack projects end to end in a lean IT team, working directly with the CEO and COO to turn requirements into shipped products.",
    highlights: [
      "Built a VGG16 document-comparison model for Smart Document Processing (SDP/IDP), improving comparison accuracy by 15%.",
      "Designed and deployed Okta SSO for Yujj, with NFC-card and QR-code redirection flows.",
      "Built KoyoX, a GPT-4 job assistant with text, voice and an interactive avatar, within a month of the Assistants API release; integrated KoyoX Beta into the careers site (PHP/MySQL).",
      "Built the DIGITYS GPT interface, giving employees GPT access without the OpenAI portal.",
      "Bitbucket CI/CD with Docker deployment to Azure; code reviews cut deployment time by 25%.",
    ],
    skills: ["Python", "TensorFlow", "OpenAI API", "Flask", "Okta", "Azure", "Docker", "Java", "Angular", "Spring Boot"],
    image: "gallery/PTSGroup.jpg",
  },
  {
    id: "travarsa-2022",
    kind: "work",
    org: "Travarsa Private Limited",
    title: "Web Developer Intern",
    employment: "Internship",
    start: "2022-07",
    end: "2022-08",
    location: "Kolkata, India",
    summary: "Delivered the full-stack WordPress site for MediFitServe.",
    highlights: [
      "Custom pop-ups, responsive design and file-upload functionality.",
      "SEO/SEM analysis that grew site traffic by 40%.",
      "Streamlined deployment to custom hosting, cutting completion time by 20%.",
    ],
    skills: ["WordPress", "PHP", "SEO"],
    image: "companies/travarsa-private-limited.jpg",
  },
  {
    id: "travarsa-2020",
    kind: "work",
    org: "Travarsa Private Limited",
    title: "Web Designer & Digital Marketing Analyst Intern",
    employment: "Internship",
    start: "2020-04",
    end: "2020-06",
    location: "Kolkata, India",
    summary: "Built the full-stack WordPress site for Guide Me Wide and ran its marketing campaigns.",
    highlights: [
      "Dynamic pop-ups and file uploads, boosting user retention by 25%.",
      "Digital marketing campaigns that improved search rankings by 50%.",
      "Automated deployment workflows to custom servers.",
    ],
    skills: ["WordPress", "PHP", "Digital Marketing"],
    image: "companies/travarsa-private-limited.jpg",
  },
];

export const degrees: Degree[] = [
  {
    id: "amity-mca",
    degree: "Master of Computer Applications",
    short: "MCA",
    school: "Amity University Kolkata",
    institute: "Amity Institute of Information Technology",
    start: "2021-08",
    end: "2023-06",
    cgpa: 8.28,
    division: "First Division",
    sgpa: [9.32, 7.54, 8.0, 8.25],
    mediumOfInstruction: "English",
    coursework: [
      "Artificial Intelligence & Robotics",
      "Machine Learning using Python",
      "Cloud Infrastructure & Services",
      "Advanced DBMS",
      "Advanced Software Engineering",
      "Data Structures & Algorithm Design",
      "Unix/Linux Programming",
      "Graph Theory",
    ],
    roles: ["Class Representative", "Event Manager"],
    image: "gallery/AvishakeAmityMCAGradMain.JPG",
  },
  {
    id: "amity-bca",
    degree: "Bachelor of Computer Applications",
    short: "BCA",
    school: "Amity University Kolkata",
    institute: "Amity Institute of Information Technology",
    start: "2018-08",
    end: "2021-07",
    cgpa: 8.21,
    division: "First Division",
    sgpa: [6.65, 7.6, 7.92, 8.76, 9.25, 8.96],
    mediumOfInstruction: "English",
    coursework: [
      "Image Processing",
      "IoT-Based Product Design",
      "Embedded Systems",
      "Data Warehousing & Mining",
      "Network Security",
      "Java & Python Programming",
      "Unix & Shell Programming",
    ],
    roles: ["Class Representative", "IT Club Admin"],
    certificates: ["German language course (working knowledge)", "Behavioural Science", "Human Values & Community Outreach"],
    image: "gallery/AvishakeAmityBCAGrad.jpg",
  },
];

export const honors: Honor[] = [
  {
    title: "Shree Baljit Shastri Award for the Best in Human & Traditional Values",
    issuer: "Amity University Kolkata · Achiever's Award",
    date: "2023-06",
    roleId: "amity-mca",
    description:
      "Conferred at the Class of 2023 convocation (MCA 2021–23) on students who display excellence in honesty, integrity, respect for others, a caring attitude and respect for heritage and culture.",
    image: "awards/baljit-shastri-award.jpg",
  },
];

export const roleById = (id: string) => roles.find((r) => r.id === id);
export const degreeById = (id: string) => degrees.find((d) => d.id === id);
