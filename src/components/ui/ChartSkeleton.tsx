import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  title?: string;
  description?: string;
  height?: number;
}

export function ChartSkeleton({ 
  title = "Loading...", 
  description = "Calculating projections",
  height = 400 
}: ChartSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div 
          className="relative flex items-center justify-center bg-muted/30 rounded-lg"
          style={{ height }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <span className="text-sm text-muted-foreground animate-pulse">
              Calculating...
            </span>
          </div>
          
          {/* Simulated chart lines */}
          <div className="absolute inset-4 flex flex-col justify-end gap-2 opacity-20">
            <Skeleton className="h-[60%] w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          {/* Header */}
          <div className="flex gap-2 p-3 border-b bg-muted/30">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          
          {/* Rows */}
          <div className="divide-y">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 p-3">
                {Array.from({ length: 8 }).map((_, colIndex) => (
                  <Skeleton 
                    key={colIndex} 
                    className="h-4 flex-1" 
                    style={{ 
                      animationDelay: `${(rowIndex * 8 + colIndex) * 50}ms` 
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-center mt-4 gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading projections...</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
