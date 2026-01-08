import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/dashboard/Sidebar";
import { Search, User, Bell, Shield, Palette, Globe, Moon, Sun, Save, Volume2, VolumeX, Mail, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useSettings } from "@/hooks/useSettings";
import { alertSound } from "@/lib/alertSound";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import TwoFactorAuth from "@/components/settings/TwoFactorAuth";
import { SessionManagement } from "@/components/settings/SessionManagement";
import { languageCodes } from "@/i18n/config";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings, saveSettings, toggleSetting } = useSettings();
  const { user, updatePassword, updateEmail } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === "dark" : true;

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const handleSoundToggle = (checked: boolean) => {
    saveSettings({ soundEnabled: checked });
    if (checked) {
      // Play test sound when enabling
      alertSound.playTestSound();
    }
  };

  // Profile form state
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  // General settings local state (saved on button click)
  const [selectedLanguage, setSelectedLanguage] = useState(settings.language);
  const [selectedCurrency, setSelectedCurrency] = useState(settings.currency);

  // Sync local state when settings are loaded
  useEffect(() => {
    setSelectedLanguage(settings.language);
    setSelectedCurrency(settings.currency);
  }, [settings.language, settings.currency]);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "general", label: "General", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
  ];

  const handleSave = () => {
    saveSettings({ 
      language: selectedLanguage, 
      currency: selectedCurrency 
    });
    // Change language in i18n
    const langCode = languageCodes[selectedLanguage] || "en";
    i18n.changeLanguage(langCode);
    // Dispatch event for currency context to update
    window.dispatchEvent(new Event("settingsChanged"));
    toast({
      title: t("settings.settingsSaved"),
      description: t("settings.settingsSavedDesc"),
    });
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const emailResult = emailSchema.safeParse(newEmail);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    
    setIsUpdatingEmail(true);
    const { error } = await updateEmail(newEmail);
    setIsUpdatingEmail(false);
    
    if (error) {
      toast({
        title: "Email update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Verification email sent",
      description: "Please check your new email to confirm the change.",
    });
    setNewEmail("");
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      setErrors({ password: passwordResult.error.errors[0].message });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    
    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsUpdatingPassword(false);
    
    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    
    setIsDeletingAccount(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in again to delete your account.",
          variant: "destructive",
        });
        setIsDeletingAccount(false);
        return;
      }

      const response = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search settings"
                className="w-64 bg-secondary border-border pl-10"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        <div className="p-6">
          {/* Tabs Navigation - Stacked vertically */}
          <div className="space-y-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all text-left",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-card/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-6">

            {/* Settings Content */}
            <div className="rounded-2xl border border-border bg-card p-6">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
                    
                    <div className="p-4 rounded-xl bg-secondary/50 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user?.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Change Email */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Change Email</h3>
                    <form onSubmit={handleEmailUpdate} className="space-y-4">
                      <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-email">New Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="new-email"
                              type="email"
                              placeholder="Enter new email"
                              value={newEmail}
                              onChange={(e) => {
                                setNewEmail(e.target.value);
                                setErrors((prev) => ({ ...prev, email: undefined }));
                              }}
                              className="pl-10"
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-destructive">{errors.email}</p>
                          )}
                        </div>
                        <Button type="submit" disabled={isUpdatingEmail || !newEmail}>
                          {isUpdatingEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Update Email
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Change Password */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                      <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="Enter new password"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setErrors((prev) => ({ ...prev, password: undefined }));
                              }}
                              className="pl-10"
                            />
                          </div>
                          {errors.password && (
                            <p className="text-sm text-destructive">{errors.password}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="Confirm new password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                              }}
                              className="pl-10"
                            />
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                          )}
                        </div>
                        <Button type="submit" disabled={isUpdatingPassword || !newPassword || !confirmPassword}>
                          {isUpdatingPassword ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Update Password
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "general" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                        <div>
                          <div className="font-medium text-foreground">Language</div>
                          <div className="text-sm text-muted-foreground">Select your preferred language</div>
                        </div>
                        <select 
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        >
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                          <option value="Chinese">Chinese</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                        <div>
                          <div className="font-medium text-foreground">Currency</div>
                          <div className="text-sm text-muted-foreground">Default display currency</div>
                        </div>
                        <select 
                          value={selectedCurrency}
                          onChange={(e) => setSelectedCurrency(e.target.value)}
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CNY">CNY (¥)</option>
                          <option value="JPY">JPY (¥)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Save Button for General Settings */}
                  <div className="pt-4 border-t border-border">
                    <Button onClick={handleSave} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        {settings.soundEnabled ? (
                          <Volume2 className="h-5 w-5 text-primary" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">Alert Sounds</div>
                          <div className="text-sm text-muted-foreground">Play sound when price alerts trigger</div>
                        </div>
                      </div>
                      <Switch 
                        checked={settings.soundEnabled}
                        onCheckedChange={handleSoundToggle}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div>
                        <div className="font-medium text-foreground">Push Notifications</div>
                        <div className="text-sm text-muted-foreground">Receive push notifications for updates</div>
                      </div>
                      <Switch 
                        checked={settings.notifications}
                        onCheckedChange={(checked) => saveSettings({ notifications: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div>
                        <div className="font-medium text-foreground">Price Alerts</div>
                        <div className="text-sm text-muted-foreground">Get notified when prices hit targets</div>
                      </div>
                      <Switch 
                        checked={settings.priceAlerts}
                        onCheckedChange={(checked) => saveSettings({ priceAlerts: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Appearance</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        {isDarkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-warning" />}
                        <div>
                          <div className="font-medium text-foreground">Dark Mode</div>
                          <div className="text-sm text-muted-foreground">Toggle dark/light theme</div>
                        </div>
                      </div>
                      <Switch 
                        checked={isDarkMode}
                        onCheckedChange={handleThemeToggle}
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="font-medium text-foreground mb-3">Theme Colors</div>
                      <div className="flex gap-3">
                        <button className="w-10 h-10 rounded-full bg-primary border-2 border-primary-foreground" />
                        <button className="w-10 h-10 rounded-full bg-chart-cyan border-2 border-transparent hover:border-foreground/50" />
                        <button className="w-10 h-10 rounded-full bg-success border-2 border-transparent hover:border-foreground/50" />
                        <button className="w-10 h-10 rounded-full bg-warning border-2 border-transparent hover:border-foreground/50" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
                  
                  <div className="space-y-4">
                    {/* Two-Factor Authentication Component */}
                    <TwoFactorAuth />

                    {/* Active Sessions */}
                    <SessionManagement />

                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="font-medium text-foreground mb-2">Change Password</div>
                      <div className="text-sm text-muted-foreground mb-3">Update your account password</div>
                      <Button variant="outline" onClick={() => setActiveTab("profile")}>
                        Go to Profile Settings
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                      <div className="font-medium text-destructive mb-2">Danger Zone</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </div>
                      <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Account Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl w-full max-w-md mx-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <h3 className="text-xl font-bold text-destructive">Delete Account</h3>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      This will permanently delete your account and all your data including:
                    </p>
                    <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside space-y-1">
                      <li>All price alerts</li>
                      <li>All analysis history</li>
                      <li>Your account credentials</li>
                    </ul>
                    <p className="text-sm text-foreground font-medium mb-4">
                      Type <span className="text-destructive font-bold">DELETE</span> to confirm:
                    </p>
                    
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="mb-4"
                    />
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        disabled={isDeletingAccount}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                      >
                        {isDeletingAccount ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;