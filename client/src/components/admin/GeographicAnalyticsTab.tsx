import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Globe, MapPin, RefreshCw, Users, TrendingUp, Flag
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

interface GeographicData {
  usersByCountry: Array<{ country: string; countryCode: string; count: number; percentage: number }>;
  assessmentsByCountry: Array<{ country: string; countryCode: string; count: number; percentage: number }>;
  revenueByCountry: Array<{ country: string; countryCode: string; revenue: number; currency: string; percentage: number }>;
  topRegions: Array<{ region: string; countries: string[]; userCount: number; assessmentCount: number }>;
  recentLocations: Array<{ country: string; city?: string; timestamp: string; type: string }>;
}

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];

export default function GeographicAnalyticsTab() {
  const { data, isLoading, refetch } = useQuery<GeographicData>({
    queryKey: ["/api/admin/analytics/geographic"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const usersByCountry = data?.usersByCountry || [];
  const assessmentsByCountry = data?.assessmentsByCountry || [];
  const revenueByCountry = data?.revenueByCountry || [];
  const topRegions = data?.topRegions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-500" />
            Geographic Analytics
          </h3>
          <p className="text-sm text-white/70">User distribution and activity by location</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="border-white/30 text-white hover:bg-white/10 hover:text-white">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Countries Reached</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usersByCountry.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {usersByCountry[0]?.country || "N/A"}
            </div>
            <p className="text-sm text-muted-foreground">{usersByCountry[0]?.count || 0} users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Revenue Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{revenueByCountry[0]?.country || "N/A"}</div>
            <p className="text-sm text-muted-foreground">
              {revenueByCountry[0] ? `${revenueByCountry[0].percentage.toFixed(1)}% of revenue` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{topRegions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users by Country</CardTitle>
            <CardDescription>Distribution of registered users</CardDescription>
          </CardHeader>
          <CardContent>
            {usersByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usersByCountry.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="country" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No geographic data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessments by Country</CardTitle>
            <CardDescription>Where assessments are being completed</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentsByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assessmentsByCountry.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="country"
                    label={({ country, percentage }) => `${country}: ${percentage.toFixed(0)}%`}
                  >
                    {assessmentsByCountry.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No assessment data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Country Breakdown</CardTitle>
          <CardDescription>Detailed statistics by country</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Revenue Share</TableHead>
                  <TableHead>Distribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersByCountry.map((country) => {
                  const assessmentData = assessmentsByCountry.find(a => a.countryCode === country.countryCode);
                  const revenueData = revenueByCountry.find(r => r.countryCode === country.countryCode);
                  
                  return (
                    <TableRow key={country.countryCode}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {country.country}
                          <Badge variant="outline" className="text-xs">{country.countryCode}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{country.count.toLocaleString()}</TableCell>
                      <TableCell>{assessmentData?.count.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        {revenueData ? `${revenueData.percentage.toFixed(1)}%` : "0%"}
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <div className="flex items-center gap-2">
                          <Progress value={country.percentage} className="h-2" />
                          <span className="text-sm text-muted-foreground w-12">{country.percentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {topRegions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Regional Overview</CardTitle>
            <CardDescription>Aggregated statistics by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {topRegions.map((region) => (
                <Card key={region.region} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{region.region}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Users</span>
                      <span className="font-medium">{region.userCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Assessments</span>
                      <span className="font-medium">{region.assessmentCount.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {region.countries.slice(0, 5).map(c => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {region.countries.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{region.countries.length - 5}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
