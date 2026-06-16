import ContentPageView from "@/app/components/ContentPageView";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function HubPage({ params }: PageProps) {
    const { slug } = await params;
    return <ContentPageView slug={slug} />;
}
