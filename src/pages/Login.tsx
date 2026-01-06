import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, Key, ArrowRight, Loader2, Copy, Check, Shield, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAccessKey, isValidAccessKey, formatAccessKey, parseAccessKey } from "@/lib/crypto-auth";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [accessKey, setAccessKey] = useState("");
  const [userName, setUserName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGenerateKey = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create an account.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const key = generateAccessKey();
      
      // Store the access key and name in the database
      const { data, error } = await supabase
        .from("user_wallets")
        .insert({ public_key: key, name: userName.trim() })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Key collision",
            description: "Please try again to generate a new key.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setGeneratedKey(key);
        
        // Auto-login after creating account
        localStorage.setItem("wallet_session", JSON.stringify({
          walletId: data.id,
          publicKey: key,
          name: userName.trim(),
          authenticatedAt: new Date().toISOString(),
        }));
        
        toast({
          title: "Account Created!",
          description: "Save your access key securely. You'll need it to recover your account.",
        });
      }
    } catch (error) {
      console.error("Key generation error:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(formatAccessKey(generatedKey));
      setCopied(true);
      toast({
        title: "Access Key Copied",
        description: "Store it somewhere safe. You'll need it to recover your account!",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRecoverAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = parseAccessKey(accessKey);
    
    if (!isValidAccessKey(cleanKey)) {
      toast({
        title: "Invalid Access Key",
        description: "Access key must be 11 alphanumeric characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if the access key exists in the database
      const { data, error } = await supabase
        .from("user_wallets")
        .select("id, public_key, name")
        .eq("public_key", cleanKey)
        .single();

      if (error || !data) {
        toast({
          title: "Account Not Found",
          description: "No account found with this access key. Please check your key or create a new account.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Store session in localStorage
      localStorage.setItem("wallet_session", JSON.stringify({
        walletId: data.id,
        publicKey: data.public_key,
        name: data.name,
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
        title: "Recovery Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToApp = () => {
    navigate("/dashboard");
  };

  const handleAccessKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setAccessKey(value);
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
            <span className="text-sm text-muted-foreground">Secure Access</span>
          </div>

          <Tabs defaultValue="recover" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="recover">Login</TabsTrigger>
              <TabsTrigger value="generate">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="recover" className="space-y-4">
              <h1 className="text-center text-xl font-bold text-foreground">
                Login to Your Account
              </h1>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Enter your 11-character access key
              </p>

              <form onSubmit={handleRecoverAccount} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Access Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="XXX-XXXX-XXXX"
                      value={accessKey}
                      onChange={handleAccessKeyChange}
                      className="bg-secondary border-border pl-10 font-mono text-lg tracking-wider uppercase"
                      maxLength={13}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: ABC-1234-XY56
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 glow-purple"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <h1 className="text-center text-xl font-bold text-foreground">
                Create New Account
              </h1>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Generate your unique access key
              </p>

              {!generatedKey ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter your name..."
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="bg-secondary border-border pl-10"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGenerateKey}
                    className="w-full bg-primary hover:bg-primary/90 glow-purple"
                    disabled={isGenerating || !userName.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-xs text-destructive font-medium mb-2">
                      ⚠️ IMPORTANT: Save your access key now!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This is the only way to recover your account. Store it securely.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      Your Access Key
                    </label>
                    <div className="relative">
                      <Input
                        value={formatAccessKey(generatedKey)}
                        readOnly
                        className="bg-secondary border-border font-mono text-xl tracking-widest text-center pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
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
                    onClick={() => setGeneratedKey(null)}
                    className="w-full"
                  >
                    Generate New Key
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your access key is your login credential.
              <br />
              Keep it safe and never share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
