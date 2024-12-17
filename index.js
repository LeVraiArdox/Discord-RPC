const rpc = require("discord-rpc");
const os = require("os");
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

class DiscordRPCManager {
  constructor(clientId) {
    this.clientId = clientId;
    this.client = null;
    this.activeEditor = '';
    this.isListeningToSpotify = false;
    this.currentTrack = '';
    this.previousActivity = null;
  }

  async init() {
    await this.waitForDiscord();
    rpc.register(this.clientId);
    this.client = new rpc.Client({ transport: "ipc" });
    
    this.client.on("ready", () => {
      console.log("Discord RPC is ready.");
      this.startActivityUpdates();
    });

    try {
      await this.client.login({ clientId: this.clientId });
    } catch (error) {
      console.error("Failed to login to Discord RPC:", error);
    }
  }

  async waitForDiscord() {
    while (!(await this.isDiscordRunning())) {
      console.log("Discord is not running. Waiting...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async isDiscordRunning() {
    const clients = ['discord', 'vesktop'];
    try {
      const checks = await Promise.all(
        clients.map(async (client) => {
          try {
            const { stdout } = await execAsync(`pgrep -x ${client}`);
            return stdout.trim().length > 0;
          } catch {
            return false;
          }
        })
      );
      return checks.some(Boolean);
    } catch {
      return false;
    }
  }

  async checkIfCoding() {
    const editors = ['code', 'subl', 'idea', 'atom', 'vim', 'emacs', 'nvim', 'lite-xl'];
    try {
      const checks = await Promise.all(
        editors.map(async (editor) => {
          try {
            const { stdout } = await execAsync(`pgrep -x ${editor}`);
            if (stdout.trim().length > 0) {
              this.activeEditor = editor;
              return true;
            }
            return false;
          } catch {
            return false;
          }
        })
      );
      return checks.some(Boolean);
    } catch {
      return false;
    }
  }

  async checkIfListeningToSpotify() {
    try {
      const { stdout } = await execAsync("playerctl -l");
      this.isListeningToSpotify = stdout.trim().split("\n").includes("spotify");
      return this.isListeningToSpotify;
    } catch {
      this.isListeningToSpotify = false;
      return false;
    }
  }

  async getSpotifyTrackInfo() {
    try {
      const { stdout } = await execAsync('playerctl metadata --format "{{ title }} - {{ artist }}"');
      this.currentTrack = stdout.trim() || "Unknown Track";
    } catch {
      this.currentTrack = "Unknown Track";
    }
    return this.currentTrack;
  }

  async setActivity() {
    let activityDetails = {
      details: "Is working (or not)",
      state: `Uptime: ${Math.round(os.uptime() / 60)} minutes`,
      largeImageKey: "axos",
      largeImageText: "AxOS",
      instance: false,
      buttons: [
        {
          label: "Install AxOS",
          url: "https://www.axos-project.com"
        }
      ]
    };

    try {
      const isCoding = await this.checkIfCoding();
      await this.checkIfListeningToSpotify();

      if (this.isListeningToSpotify) {
        await this.getSpotifyTrackInfo();
        activityDetails = {
          ...activityDetails,
          details: "Listening Spotify",
          state: this.currentTrack,
          smallImageKey: "spotify",
          smallImageText: "Spotify"
        };
      } else if (isCoding) {
        activityDetails = {
          ...activityDetails,
          details: `Coding on ${this.activeEditor}`,
          smallImageKey: "vscode",
          smallImageText: "Coding"
        };
      }

      // Only update if activity has changed to reduce unnecessary API calls
      const activityString = JSON.stringify(activityDetails);
      if (activityString !== this.previousActivity) {
        this.client.setActivity(activityDetails);
        this.previousActivity = activityString;
      }
    } catch (error) {
      console.error("Error setting activity:", error);
    }
  }

  startActivityUpdates() {
    // Initial update
    this.setActivity();
    
    // Update every 15 seconds instead of 5 to reduce system load
    setInterval(() => this.setActivity(), 15000);
  }
}

// Usage
const clientId = "1242141055722328247";
const discordRPC = new DiscordRPCManager(clientId);
discordRPC.init().catch(console.error);