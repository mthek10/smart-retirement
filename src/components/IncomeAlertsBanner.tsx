import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { IncomeAlert } from "@/lib/incomeAlerts";

interface IncomeAlertsBannerProps {
  alerts: IncomeAlert[];
}

export function IncomeAlertsBanner({ alerts }: IncomeAlertsBannerProps) {
  if (alerts.length === 0) return null;

  const getAlertVariant = (severity: IncomeAlert['severity']) => {
    switch (severity) {
      case 'danger': return 'destructive';
      case 'warning': return 'default';
      default: return 'default';
    }
  };

  const getAlertIcon = (severity: IncomeAlert['severity']) => {
    switch (severity) {
      case 'danger': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getAlertStyles = (severity: IncomeAlert['severity']) => {
    switch (severity) {
      case 'danger': 
        return 'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive';
      case 'warning': 
        return 'border-warning/50 bg-warning/10 text-warning-foreground dark:border-warning';
      default: 
        return 'border-primary/50 bg-primary/10 text-primary-foreground';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Alert 
          key={`${alert.type}-${alert.yearIndex}-${index}`}
          className={getAlertStyles(alert.severity)}
        >
          {getAlertIcon(alert.severity)}
          <AlertTitle className="flex items-center gap-2">
            <span>{alert.title}</span>
            <span className="text-xs font-normal opacity-75">Age {alert.age}</span>
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{alert.message}</p>
            {alert.recommendation && (
              <p className="text-sm font-medium opacity-90">
                💡 {alert.recommendation}
              </p>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
