import Layout from '@/components/Layout';

export const metadata = {
    title: 'Terms of Use | FretHunt',
    description: 'Terms of Use for FretHunt. Rules and conditions for using our service.',
    robots: {
        index: false,
        follow: true,
    },
};

export default function TermsPage() {
    return (
        <Layout allowScroll={true}>
            <main className="w-full max-w-4xl mx-auto px-6 py-12 text-slate-300 font-light leading-relaxed pt-24 pb-48">
                <header className="mb-12 border-b border-slate-700 pb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Terms of Use</h1>
                    <p className="text-slate-500 text-sm uppercase tracking-widest">Effective Date: January 1, 2026</p>
                </header>

                <section className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
                        <p>
                            These Terms of Use constitute a legally binding agreement between you and FretHunt concerning your access to and use of the specific website as well as any other media form related to it. You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Use.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">2. Intellectual Property Rights</h2>
                        <p>
                            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site represent our intellectual property.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">3. User Representations</h2>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-slate-400">
                            <li>You have the legal capacity and you agree to comply with these Terms of Use;</li>
                            <li>You are not a minor in the jurisdiction in which you reside;</li>
                            <li>You will not access the Site through automated or non-human means;</li>
                            <li>You will not use the Site for any illegal or unauthorized purpose;</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">4. Disclaimer</h2>
                        <p>
                            THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SITE AND YOUR USE THEREOF.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-3">5. Limitation of Liability</h2>
                        <p>
                            IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE.
                        </p>
                    </div>

                    <div className="border-t border-slate-700 pt-8 mt-8">
                        <h2 className="text-xl font-bold text-white mb-2">Contact Us</h2>
                        <p>
                            If you have questions regarding these Terms, please contact us at: <a href="mailto:info@joox.se" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">info@joox.se</a>
                        </p>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
