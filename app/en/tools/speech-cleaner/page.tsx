import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata=pageMetadata({title:{absolute:"Remove Audio Noise Online – Free Podcast & Voice Cleaner | Beatzucker"},description:"Clean up voice recordings online: reduce background hiss and rumble, even out speech levels, compare and download a WAV. Free, up to 5 minutes per recording.",alternates:{canonical:"https://beatzucker.de/en/tools/speech-cleaner",languages:{"de-DE":"https://beatzucker.de/tools/speech-cleaner",en:"https://beatzucker.de/en/tools/speech-cleaner","x-default":"https://beatzucker.de/tools/speech-cleaner"}}});
export default function Page(){return <AudioUtilityPage lang="en" tool="speech-cleaner"/>}
