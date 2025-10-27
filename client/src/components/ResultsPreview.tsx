import resultsImage from "@assets/generated_images/Assessment_results_dashboard_mockup_5a4dadce.png";

export default function ResultsPreview() {
  return (
    <section className="py-24 bg-[#0f1f38]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white">
            Professional Results You Can Trust
          </h2>
          <p className="text-lg text-blue-100/70 max-w-2xl mx-auto">
            Comprehensive reports with detailed skill breakdowns, visualizations, and actionable insights
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f38] via-transparent to-transparent z-10 pointer-events-none rounded-2xl" />
          <img
            src={resultsImage}
            alt="Sample assessment results dashboard"
            className="w-full rounded-2xl shadow-2xl border border-cyan-400/20"
          />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { label: "Detailed Score Breakdown", value: "6 Skills" },
            { label: "Professional PDF Export", value: "CV-Ready" },
            { label: "Percentile Rankings", value: "Industry Benchmarked" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold font-mono text-cyan-400 mb-2" data-testid={`text-stat-value-${index + 1}`}>
                {stat.value}
              </div>
              <div className="text-sm text-blue-100/60" data-testid={`text-stat-label-${index + 1}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
