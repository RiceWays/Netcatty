import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { ChevronLeft, Shield, Wifi, Cloud, Radio, ArrowRightLeft, Zap } from "lucide-react";

type RuleType = "local" | "remote" | "dynamic";

interface Rule {
  id: string;
  label: string;
  type: RuleType;
  desc: string;
}

const TYPE_COPY: Record<RuleType, { title: string; body: string }> = {
  local: {
    title: "Local Port Forwarding",
    body: "Local forwarding lets you access a remote server's listening port as though it were local."
  },
  remote: {
    title: "Remote Port Forwarding",
    body: "Remote forwarding opens a port on the remote machine and forwards connections to your local host."
  },
  dynamic: {
    title: "Dynamic Port Forwarding",
    body: "Dynamic forwarding turns the client into a SOCKS proxy to request connections via the remote host."
  }
};

const TYPE_TAG: Record<RuleType, string> = {
  local: "Local Rule",
  remote: "Remote Rule",
  dynamic: "Dynamic Rule"
};

interface PortForwardingProps {
  initialRules?: Rule[];
}

const PortForwarding: React.FC<PortForwardingProps> = ({ initialRules }) => {
  const [rules, setRules] = useState<Rule[]>(() =>
    initialRules ?? [
      { id: "1", label: "Local Rule", type: "local", desc: "ssh, root" },
      { id: "2", label: "Remote Rule", type: "remote", desc: "ssh, root" },
      { id: "3", label: "Dynamic Rule", type: "dynamic", desc: "ssh, root" }
    ]
  );
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id);
  const [wizardType, setWizardType] = useState<RuleType>("local");

  const selectedRule = useMemo(() => rules.find((r) => r.id === selectedRuleId), [rules, selectedRuleId]);

  const addRule = (type: RuleType) => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      type,
      label: TYPE_TAG[type],
      desc: "ssh, root"
    };
    setRules((prev) => [...prev, newRule]);
    setSelectedRuleId(newRule.id);
    setWizardType(type);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 px-6 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="h-9 px-3 rounded-md shadow-sm">
            NEW FORWARDING
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="secondary" className="rounded-full px-2">Port Forwarding</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold">Port Forwarding</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {rules.map((rule) => (
              <Card
                key={rule.id}
                onClick={() => { setSelectedRuleId(rule.id); setWizardType(rule.type); }}
                className={cn(
                  "cursor-pointer soft-card elevate rounded-xl border border-transparent hover:border-primary/60 transition-all",
                  selectedRuleId === rule.id && "border-primary/70"
                )}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {rule.label.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{rule.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{rule.desc}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card
              onClick={() => addRule("local")}
              className="cursor-pointer soft-card elevate rounded-xl border border-dashed border-border/80 hover:border-primary/60 transition-all"
            >
              <CardContent className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                + Add rule
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="w-[360px] border-l border-border/70 bg-secondary/90 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {TYPE_TAG[wizardType]}
            </p>

          </div>
          <ArrowRightLeft className="text-muted-foreground" size={16} />
        </div>

        <div className="bg-card rounded-xl border border-border/70 p-4 space-y-4 soft-card">
          <div className="flex gap-2">
            {(["local", "remote", "dynamic"] as RuleType[]).map((type) => (
              <Button
                key={type}
                variant={wizardType === type ? "secondary" : "ghost"}
                size="sm"
                className={cn("flex-1", wizardType === type && "bg-primary/15 text-foreground")}
                onClick={() => setWizardType(type)}
              >
                {type[0].toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 py-6 text-muted-foreground">
            <Shield size={36} />
            <ArrowRightLeft />
            {wizardType === "local" && <Wifi size={36} />}
            {wizardType === "remote" && <Cloud size={36} />}
            {wizardType === "dynamic" && <Radio size={36} />}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold">{TYPE_COPY[wizardType].title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{TYPE_COPY[wizardType].body}</p>
          </div>

          <div className="space-y-2">
            <Input placeholder="Port number" className="h-10" />
            {wizardType !== "remote" && <Input placeholder="Bind address" defaultValue="127.0.0.1" className="h-10" />}
            {wizardType === "remote" && <Input placeholder="Select a host" className="h-10" />}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button className="w-full h-10 bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
            <Button variant="ghost" className="w-full h-10 text-muted-foreground hover:text-foreground">
              Skip wizard
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap size={14} /> This is a mock UI scaffold for port forwarding.
        </div>
      </div>
    </div>
  );
};

export default PortForwarding;
