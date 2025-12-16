import PlayClient from './PlayClient'

// Required for static export - generates empty array since codes are dynamic
export function generateStaticParams() {
    return []
}

// Dynamic parameter configuration
export const dynamicParams = true

export default function PlayPage({ params }) {
    return <PlayClient code={params.code} />
}
