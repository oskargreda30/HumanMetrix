import resultsImage from "@assets/generated_images/Professional_results_preview.png";

export default function ResultsPreview() {
  return (
    <section className="py-12 md:py-24 bg-[#0f1f38]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-lg md:text-4xl font-semibold mb-2 md:mb-4 text-white px-2">
            Professional Results You Can Trust
          </h2>
          <p className="text-xs md:text-lg text-blue-100/70 max-w-2xl mx-auto px-2">
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

        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
          {[
            { label: "Detailed Score Breakdown", value: "Multiple Assessments" },
            { label: "Professional PDF Export", value: "CV-Ready" },
            { label: "Percentile Rankings", value: "Industry Benchmarked" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-sm md:text-2xl font-bold text-cyan-400 mb-1 md:mb-2" data-testid={`text-stat-value-${index + 1}`}>
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-blue-100/60" data-testid={`text-stat-label-${index + 1}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
