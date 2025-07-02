import React, { useState } from 'react';

const LogFileProcessor = () => {
    const [loading, setLoading] = useState(false);
    const [ipCounts, setIpCounts] = useState([]);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [downloadFileName, setDownloadFileName] = useState('');

    const handleFileUpload = (event) => {
        setLoading(true);
        const file = event.target.files[0];

        const reader = new FileReader();
        reader.onload = () => {
            const fileContent = reader.result;
            const lines = fileContent.split('\n');
            const ipMap = new Map();

            lines.forEach(line => {
                if (line.trim()) {
                    try {
                        const logEntry = JSON.parse(line);
                        const { timestamp, message } = logEntry;

                        const logTime = new Date(timestamp);
                        const hour = logTime.getHours();
                        const minutes = logTime.getMinutes();

                        if (hour === 11 && minutes >= 19 && minutes < 27) {  
                            const ip = extractIpFromMessage(message);

                            if (ip) {
                                ipMap.set(ip, (ipMap.get(ip) || 0) + 1);
                            }
                        }
                    } catch (error) {
                        console.error("Error al parsear la línea:", error);
                    }
                }
            });

            const ipCountsArray = Array.from(ipMap, ([ip, count]) => ({ ip, count }))
                .sort((a, b) => b.count - a.count);
            setIpCounts(ipCountsArray);

            const dateStr = new Date().toISOString().split('T')[0];
            setDownloadFileName(`log_${dateStr}`);

            const csvContent = generateCsvContent(ipCountsArray);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            setDownloadUrl(URL.createObjectURL(blob));

            setLoading(false);
        };

        reader.readAsText(file);
    };

    function extractIpFromMessage(message) {
      const regex = /'x-real-ip'\s*=>\s*\{\s*name:\s*'x-real-ip',\s*value:\s*'([\d.]+)'\s*\}/;
      const match = message.match(regex);
      
      return match ? match[1] : null;
    }

    function generateCsvContent(data) {
        const header = 'IP Address,Count\n';
        const rows = data.map(({ ip, count }) => `${ip},${count}`).join('\n');
        return header + rows;
    }

    return (
        <div>
            <h1>Log File Processor</h1>
            <input type="file" accept=".log,.txt" onChange={handleFileUpload} />
            
            {loading && <p>Loading...</p>}
            
            {ipCounts.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>IP Address</th>
                            <th>Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ipCounts.map(({ ip, count }) => (
                            <tr key={ip}>
                                <td>{ip}</td>
                                <td>{count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {downloadUrl && (
                <a href={downloadUrl} download={downloadFileName}>Download IP Counts</a>
            )}
        </div>
    );
};

export default LogFileProcessor;
