export const profile = {
  name: "Avishake Adhikary",
  firstName: "Avishake",
  lastName: "Adhikary",
  headline: "Machine Learning Engineer",
  focus: ["Agentic AI", "LLM fine-tuning & quantization", "Healthcare AI", "Computer Vision"],
  tagline:
    "I build production AI systems: fine-tuned and quantized LLMs on the edge, agentic pipelines, and multimodal clinical AI shipped across international markets.",
  summary:
    "Machine Learning Engineer at Minion Technologies, building ZoyeMed, an internationally deployed autonomous healthcare platform. I fine-tune and quantize large language models (LoRA/QLoRA, MXFP4, llama.cpp) for edge and on-prem clinical deployment, engineer RAG and computer-vision pipelines, and run distributed multi-GPU training. Before ML took over, I shipped full-stack products end to end, and I still happily do.",
  openTo: "Open to ML / AI engineering roles, research collaborations and full-stack work.",
  location: {
    city: "Kolkata",
    region: "West Bengal",
    country: "India",
    countryCode: "IN",
    lat: 22.5726,
    lng: 88.3639,
    timezone: "Asia/Kolkata",
  },
  email: "avhishe.adhikary11@gmail.com",
  resume: "/data/AvishakeAdhikaryResume.pdf",
  site: "https://avishakeadhikary.github.io",
  socials: {
    github: "https://github.com/AvishakeAdhikary",
    linkedin: "https://www.linkedin.com/in/avishakeadhikary",
    scholar: "https://scholar.google.com/citations?user=2fegUHYAAAAJ",
    blog: "https://avishakeadhikary.github.io/blog/",
  },
  photo: "gallery/AvishakeAdhikaryDPCropped.jpg",
  languages: [
    {
      name: "English",
      level: "Native / full professional",
      note: "Medium of instruction for both degrees; professional working language since 2020.",
    },
    { name: "Bengali", level: "Native" },
    { name: "Hindi", level: "Native" },
    { name: "German", level: "Elementary", note: "Amity School of Foreign Languages course." },
    { name: "Spanish", level: "Elementary", note: "Three MCA Spanish modules." },
  ],
  /**
   * Claims that exceed what any public source lists. Kept as explicit,
   * owner-confirmed overrides instead of computed values.
   */
  claims: {
    certifications: "50+",
    programmingLanguages: "30+",
    frameworks: "10+",
  },
} as const;

export type Profile = typeof profile;
