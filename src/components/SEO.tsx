import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  url?: string;
  noindex?: boolean;
}

const SEO = ({ title, description, noindex }: SEOProps) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | King's Pong`;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const prevRobots = robotsMeta?.content;
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.name = "robots";
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = "noindex,nofollow";
    }

    return () => {
      document.title = prevTitle;
      if (noindex && robotsMeta) {
        robotsMeta.content = prevRobots || "";
      }
    };
  }, [title, description, noindex]);

  return null;
};

export default SEO;
