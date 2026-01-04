import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, Key, ArrowRight, Loader2, Copy, Check, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateKeyPair, derivePublicKey } from "@/lib/crypto-auth";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [privateKey, setPrivateKey] = useState("");
  const [generatedKeys, setGeneratedKeys] = useState<{ privateKey: string; publicKey: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    try {
      const keys = await generateKeyPair();
      setGeneratedKeys(keys);
      
      // Store the public key in the database
      const { error } = await supabase
        .from("user_wallets")
        .insert({ public_key: keys.publicKey });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Key already exists",
            description: "This key pair has already been registered. Please generate a new one.",
            variant: "destructive",
          });
          setGeneratedKeys(null);
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Wallet Created!",
          description: "Save your private key securely. You'll need it to recover your account.",
        });
      }
    } catch (error) {
      console.error("Key generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKeys?.privateKey) {
      await navigator.clipboard.writeText(generatedKeys.privateKey);
      setCopied(true);
      toast({
        title: "Private Key Copied",
        description: "Store it somewhere safe. Never share it with anyone!",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRecoverAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey.trim()) {
      toast({
        title: "Private Key Required",
        description: "Please enter your private key to recover your account.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Derive the public key from the private key
      const derivedPublicKey = await derivePublicKey(privateKey.trim());
      
      // Check if the public key exists in the database
      const { data, error } = await supabase
        .from("user_wallets")
        .select("id, public_key")
        .eq("public_key", derivedPublicKey)
        .single();

      if (error || !data) {
        toast({
          title: "Account Not Found",
          description: "No account found with this private key. Please check your key or create a new wallet.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Store session in localStorage
      localStorage.setItem("wallet_session", JSON.stringify({
        walletId: data.id,
        publicKey: data.public_key,
        authenticatedAt: new Date().toISOString(),
      }));

      toast({
        title: "Welcome back!",
        description: "Account recovered successfully. Loading your dashboard...",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Recovery error:", error);
      toast({
        title: "Invalid Private Key",
        description: "The private key format is invalid. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToApp = () => {
    if (generatedKeys) {
      localStorage.setItem("wallet_session", JSON.stringify({
        publicKey: generatedKeys.publicKey,
        authenticatedAt: new Date().toISOString(),
      }));
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-purple">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Zikalyze</span>
        </Link>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Decentralized Authentication</span>
          </div>

          <Tabs defaultValue="recover" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="recover">Recover Account</TabsTrigger>
              <TabsTrigger value="generate">Create Wallet</TabsTrigger>
            </TabsList>

            <TabsContent value="recover" className="space-y-4">
              <h1 className="text-center text-xl font-bold text-foreground">
                Recover Your Account
              </h1>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Enter your private key to access your account
              </p>

              <form onSubmit={handleRecoverAccount} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Private Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder="Enter your private key..."
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="min-h-[100px] bg-secondary border-border pl-10 font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 glow-purple"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      Recover Account <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <h1 className="text-center text-xl font-bold text-foreground">
                Create New Wallet
              </h1>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Generate a secure key pair for your account
              </p>

              {!generatedKeys ? (
                <Button
                  onClick={handleGenerateKeys}
                  className="w-full bg-primary hover:bg-primary/90 glow-purple"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Key Pair
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-xs text-destructive font-medium mb-2">
                      ⚠️ IMPORTANT: Save your private key now!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This is the only way to recover your account. Store it securely and never share it.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      Your Private Key
                    </label>
                    <div className="relative">
                      <Textarea
                        value={generatedKeys.privateKey}
                        readOnly
                        className="min-h-[80px] bg-secondary border-border font-mono text-xs pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={handleCopyKey}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleContinueToApp}
                    className="w-full bg-success hover:bg-success/90"
                  >
                    I've Saved My Key - Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setGeneratedKeys(null)}
                    className="w-full"
                  >
                    Generate New Keys
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your keys are generated locally and never transmitted.
              <br />
              Only your public key is stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
