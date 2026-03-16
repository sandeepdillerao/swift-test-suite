import { useState } from 'react';
import { ExternalLink, Link2, Unlink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { TestCase } from '@/types';

interface JiraLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | null;
  onSave: (data: {
    jiraTicketId?: string;
    jiraTicketUrl?: string;
    jiraSubtaskId?: string;
    jiraSubtaskUrl?: string;
    jiraSyncStatus?: TestCase['jiraSyncStatus'];
  }) => void;
  onUnlink: () => void;
}

export const JiraLinkDialog = ({ open, onOpenChange, testCase, onSave, onUnlink }: JiraLinkDialogProps) => {
  const [ticketId, setTicketId] = useState(testCase?.jiraTicketId || '');
  const [ticketUrl, setTicketUrl] = useState(testCase?.jiraTicketUrl || '');
  const [createSubtask, setCreateSubtask] = useState(!!testCase?.jiraSubtaskId);
  const isLinked = !!testCase?.jiraTicketId;

  const handleSave = () => {
    if (!ticketId.trim()) return;
    const baseUrl = ticketUrl || `https://your-domain.atlassian.net/browse/${ticketId}`;
    onSave({
      jiraTicketId: ticketId.trim(),
      jiraTicketUrl: baseUrl,
      jiraSubtaskId: createSubtask ? `${ticketId}-SUB-1` : undefined,
      jiraSubtaskUrl: createSubtask ? `${baseUrl.replace(ticketId, `${ticketId}-SUB-1`)}` : undefined,
      jiraSyncStatus: 'synced',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔷 Link to Jira
          </DialogTitle>
          <DialogDescription>
            Link this test case to a Jira story or ticket for traceability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLinked && (
            <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                  🔷 {testCase.jiraTicketId}
                </Badge>
                <span className="text-xs text-muted-foreground">Currently linked</span>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onUnlink}>
                <Unlink className="h-3 w-3 mr-1" />
                Unlink
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="jiraTicket">Jira Ticket ID *</Label>
            <Input
              id="jiraTicket"
              placeholder="e.g., PROJ-1234"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jiraUrl">Jira URL (optional)</Label>
            <Input
              id="jiraUrl"
              placeholder="https://your-domain.atlassian.net/browse/PROJ-1234"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from ticket ID if left blank
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Create Jira Subtask</Label>
              <p className="text-xs text-muted-foreground">
                Creates a subtask under this ticket for test execution tracking
              </p>
            </div>
            <Switch checked={createSubtask} onCheckedChange={setCreateSubtask} />
          </div>

          {createSubtask && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm">
              <p className="font-medium text-xs">Subtask will include:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Test case title and steps as description</li>
                <li>Test run results posted as comments</li>
                <li>Auto status sync (Pass → Done, Fail → To Do)</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!ticketId.trim()}>
            <Link2 className="h-4 w-4 mr-2" />
            {isLinked ? 'Update Link' : 'Link Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
