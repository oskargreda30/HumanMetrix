import { Link } from "wouter";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const articles = [
  {
    id: "how-to-pass-psychometric-tests-job-interviews",
    title: "How to Approach Psychometric Tests for Job Interviews: Your Ultimate UK Guide",
    description: "Struggling with job application psychometric tests? Learn exactly how to prepare, what to expect, and the best strategies to approach psychometric tests for job interviews in the UK.",
    category: "Career Advice",
    readTime: "8 min read",
    date: "November 28, 2025",
    featured: true,
  },
  {
    id: "role-of-psychometric-testing-in-recruitment",
    title: "The Essential Role of Psychometric Testing in Recruitment: A UK Perspective",
    description: "Explore the pivotal role of psychometric testing in modern recruitment. Learn why UK employers use these assessments, the types of tests involved, and how they shape the future of hiring.",
    category: "Industry Insights",
    readTime: "7 min read",
    date: "November 28, 2025",
    featured: true,
  },
];

export default function Articles() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title="Articles & Insights"
        description="Expert articles on psychometric testing, career development, and recruitment best practices. Learn how to prepare for assessments and understand the modern hiring process."
        canonical="/articles"
      />
      <Navigation />
      
      <main className="flex-grow py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-cyan-600 border-cyan-300">
              Knowledge Hub
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Articles & Insights
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Expert guidance on psychometric testing, career development, and recruitment best practices
            </p>
          </div>

          <div className="space-y-6">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card 
                  className="group cursor-pointer border-slate-200 hover-elevate transition-all duration-300"
                  data-testid={`card-article-${article.id}`}
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                          {article.featured && (
                            <Badge className="text-xs bg-cyan-500 hover:bg-cyan-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3 group-hover:text-cyan-600 transition-colors">
                          {article.title}
                        </h2>
                        
                        <p className="text-slate-600 mb-4 line-clamp-2">
                          {article.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {article.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {article.readTime}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-cyan-600 group-hover:translate-x-1 transition-transform">
                        <span className="text-sm font-medium mr-1 hidden md:inline">Read More</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
