const rpc = require('discord-rpc');
const os = require('os');
const exec = require('child_process').exec;

const clientId = 'YOUR_ID'; // Replace this


rpc.register(clientId);

const client = new rpc.Client({ transport: 'ipc' });

let activeEditor = '';
let isListeningToSpotify = false;
let currentTrack = ''; 

client.on('ready', () => {
    console.log('Discord RPC is ready.');

    function checkIfCoding() {
    return new Promise((resolve) => {
        const editors = ['code', 'subl', 'idea', 'atom', 'vim', 'emacs', 'nvim', 'lite-xl'];
        const checks = editors.map(editor => {
            return new Promise((res) => {
                exec(`pgrep -x ${editor}`, (err, stdout) => {
                    if (stdout.trim().length > 0) {
                        activeEditor = editor; // Set the active editor
                    }
                    res(stdout.trim().length > 0);
                });
            });
        });

        Promise.all(checks).then(results => {
            resolve(results.some(result => result));
            });
        });
    }

    function checkIfListeningToSpotify() {
    return new Promise((resolve) => {
        exec('playerctl -l', (err, stdout) => {
            const players = stdout.trim().split('\n');
            isListeningToSpotify = players.includes('spotify');
            resolve(isListeningToSpotify);
            });
        });
    }

    function getSpotifyTrackInfo() {
        return new Promise((resolve) => {
            exec('playerctl metadata --format "{{ title }} - {{ artist }}"', (err, stdout) => {
                if (err || !stdout.trim()) {
                    currentTrack = 'Unknown Track';
                } else {
                    currentTrack = stdout.trim();
                }
                resolve(currentTrack);
            });
        });
    }



    async function setActivity() {
        const isCoding = await checkIfCoding();
        await checkIfListeningToSpotify();

        if (isListeningToSpotify) {
            await getSpotifyTrackInfo();
            client.setActivity({
                details: `Listening Spotify`,
                state: currentTrack,
                largeImageKey: 'axos',
                largeImageText: 'AxOS',
                smallImageKey: 'spotify', // Ensure you have uploaded this asset to your Discord application
                smallImageText: 'Spotify',
                instance: false,
                buttons: [
                   {
                      label: "Install AxOS",
                      url: "https://www.axos-project.com"
                   }]
        });
        }
        else if (isCoding) {
            client.setActivity({
                details: `Coding on ${activeEditor}`, // Static title
                state: `Uptime: ${Math.round(os.uptime() / 60)} minutes`,
                largeImageKey: 'axos', // Ensure you have uploaded this asset to your Discord application
                largeImageText: 'AxOS',
                smallImageKey: 'vscode', // Ensure you have uploaded this asset to your Discord application
                smallImageText: 'Coding',
                instance: false,
                buttons: [
                   {
                      label: "Install AxOS",
                      url: "https://www.axos-project.com"
                   }]
            });
        } else {
            client.setActivity({
                details: 'Is working (or not)', // Static title
                state: `Uptime: ${Math.round(os.uptime() / 60)} minutes`,
                largeImageKey: 'axos', // Ensure you have uploaded this asset to your Discord application
                largeImageText: 'AxOS',
                instance: false,
                buttons: [
                   {
                      label: "Install AxOS",
                      url: "https://www.axos-project.com"
                   }]
            });
        }
    }

    setActivity();
    setInterval(setActivity, 5000); // Update presence every 5 seconds
});

client.login({ clientId }).catch(console.error);

