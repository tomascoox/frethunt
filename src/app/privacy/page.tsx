import Layout from '@/components/Layout';

export const metadata = {
    title: 'Privacy Policy | FretHunt',
    description: 'Privacy Policy for FretHunt. Comprehensive details on data handling, cookies, and user rights.',
    robots: {
        index: false,
        follow: true,
    },
};

export default function PrivacyPage() {
    return (
        <Layout allowScroll={true}>
            <main className="w-full max-w-4xl mx-auto px-6 py-12 text-slate-300 font-light leading-relaxed pt-24 pb-48">
                <header className="mb-12 border-b border-slate-700 pb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Privacy Policy</h1>
                    <p className="text-slate-500 text-sm uppercase tracking-widest">Effective Date: January 1, 2026</p>
                </header>

                <section className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">1. Introduction</h2>
                        <p>
                            FretHunt ("we," "us," or "our") operates the website https://frethunt.vercel.app (the "Service").
                            We are committed to protecting your privacy and ensuring you have a positive experience on our website.
                            This Privacy Policy sets forth our policy with respect to information that is collected from visitors to the Service.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">2. Information Collection and Use</h2>
                        <p className="mb-2">
                            <strong>Personal Data:</strong> We do not require users to create an account or provide personally identifiable information (PII) such as names, emails, or phone numbers to use the core functionality of the Service.
                        </p>
                        <p>
                            <strong>Usage Data:</strong> We may collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, and other diagnostic data.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">3. cookies and Local Storage</h2>
                        <p className="mb-2">
                            We use standard web technologies to enhance functionality covering:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 mb-4 text-slate-400">
                            <li><strong>Local Storage:</strong> We utilize browser Local Storage to save your preferences and progress directly on your device. This data is not transmitted to our servers for permanent storage.</li>
                            <li><strong>Cookies:</strong> Cookies are files with small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">4. Third-Party Service Providers</h2>
                        <p className="mb-2">
                            We may employ third-party companies and individuals due to the following reasons:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 mb-4 text-slate-400">
                            <li>To facilitate our Service;</li>
                            <li>To provide the Service on our behalf;</li>
                            <li>To perform Service-related services (e.g., Analytics, Advertising);</li>
                        </ul>
                        <p>
                            <strong>Google Analytics & AdSense:</strong> We use Google services to analyze traffic and display advertisements. Google may use cookies to serve ads based on a user's prior visits to this website or other websites. Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="nofollow noreferrer" className="text-blue-400 hover:text-blue-300 underline">Google Ads Settings</a>.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">5. Data Security</h2>
                        <p>
                            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">6. Links to Other Sites</h2>
                        <p>
                            Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">7. Changes to This Privacy Policy</h2>
                        <p>
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                        </p>
                    </div>

                    <div className="border-t border-slate-700 pt-8 mt-8">
                        <h2 className="text-xl font-bold text-white mb-2">Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us by email: <a href="mailto:hello@frethunt.com" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">hello@frethunt.com</a>
                        </p>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
