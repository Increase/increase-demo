import { Card, Badge, Anchor, Text } from '@mantine/core';
import { useApiLog } from '../context/ApiLogContext';
import { getDashboardPath } from '../lib/increase';

export function DebugPanel() {
  const { requests } = useApiLog();

  return (
    <div className="h-full overflow-auto bg-gray-50 p-4">
      <h2 className="text-lg font-semibold mb-4">API Requests</h2>
      <div className="flex flex-col gap-2">
        {requests.length === 0 ? (
          <Text c="dimmed" size="sm">No requests yet</Text>
        ) : (
          requests.map((req) => {
            const dashboardUrl =
              req.resourceId && getDashboardPath(req.resourceType, req.resourceId);
            return (
              <Card key={req.id} shadow="xs" padding="sm" radius="md" withBorder>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    size="sm"
                    color={req.status >= 200 && req.status < 300 ? 'green' : 'red'}
                    variant="light"
                  >
                    {req.status}
                  </Badge>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {req.method}
                  </Text>
                  <Text size="xs" ff="monospace">/{req.path}</Text>
                </div>
                {req.resourceId && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Text size="xs" c="dimmed">ID:</Text>
                      <Text size="xs" ff="monospace">{req.resourceId}</Text>
                    </div>
                    {dashboardUrl && (
                      <Anchor
                        href={dashboardUrl}
                        target="_blank"
                        size="xs"
                      >
                        Open in Dashboard
                      </Anchor>
                    )}
                  </div>
                )}
                <Text size="xs" c="dimmed" mt="xs">
                  {req.timestamp.toLocaleTimeString()}
                </Text>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
