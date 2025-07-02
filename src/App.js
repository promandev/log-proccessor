import React, { useState, useRef } from 'react';

const LogFileProcessor = () => {
    const [ipCounts1, setIpCounts1] = useState([]);
    const [ipCounts2, setIpCounts2] = useState([]);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [downloadFileName, setDownloadFileName] = useState('');
    const [customTime, setCustomTime] = useState({
        startHour: 0,
        startMinute: 0,
        rangeTime: 5,
    });

    const fileInputRef1 = useRef(null);
    const fileInputRef2 = useRef(null);

    const handleTimeInputChange = (e, type) => {
        const value = Number(e.target.value);
        setCustomTime(prev => ({ ...prev, [type]: value }));
    };

    const handleFileUpload = (event, setIpCounts) => {
        const file = event.target.files[0];
        if (!file) return;

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

                        const { startHour, startMinute, rangeTime } = customTime;
                        const rangeLimit = startMinute + rangeTime;
                        if (
                            hour === startHour &&
                            minutes >= startMinute &&
                            minutes < rangeLimit
                        ) {
                            const ip = extractIpFromMessage(message);
                            if (ip) {
                                ipMap.set(ip, (ipMap.get(ip) || 0) + 1);
                            }
                        }
                    } catch (error) {
                        console.error('Error al parsear la línea:', error);
                    }
                }
            });

            const ipCountsArray = Array.from(ipMap, ([ip, count]) => ({ ip, count }))
                .sort((a, b) => b.count - a.count);

            setIpCounts(ipCountsArray);
        };

        reader.readAsText(file);
    };

    const extractIpFromMessage = (message) => {
        const regex = /'x-real-ip'\s*=>\s*\{\s*name:\s*'x-real-ip',\s*value:\s*'([\d.]+)'\s*\}/;
        const match = message.match(regex);
        return match ? match[1] : null;
    };

    const mergeIpCounts = () => {
        const combinedMap = new Map();

        const addToMap = (ipCounts) => {
            ipCounts.forEach(({ ip, count }) => {
                combinedMap.set(ip, (combinedMap.get(ip) || 0) + count);
            });
        };

        addToMap(ipCounts1);
        addToMap(ipCounts2);

        return Array.from(combinedMap, ([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count);
    };

    const generateCsvContent = (data) => {
        const header = 'IP Address,Count\n';
        const rows = data.map(({ ip, count }) => `${ip},${count}`).join('\n');
        return header + rows;
    };

    const handleDownload = () => {
        const mergedData = mergeIpCounts();
        const csvContent = generateCsvContent(mergedData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        setDownloadUrl(URL.createObjectURL(blob));
        const dateStr = new Date().toISOString().split('T')[0];
        setDownloadFileName(`log_${dateStr}.csv`);
    };

    const resetAll = () => {
        setIpCounts1([]);
        setIpCounts2([]);
        setDownloadUrl(null);
        setDownloadFileName('');
        if (fileInputRef1.current) fileInputRef1.current.value = '';
        if (fileInputRef2.current) fileInputRef2.current.value = '';
    };

    const renderTable = (data, title) => (
        <div style={{ marginRight: '2rem' }}>
            {data.length > 0 && (
                <>
                    <h3>{title}</h3>
                    <table border="1" cellPadding="4">
                        <thead>
                            <tr>
                                <th>IP Address</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(({ ip, count }) => (
                                <tr key={ip}>
                                    <td>{ip}</td>
                                    <td>{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );

    return (
        <div style={{ padding: '1rem' }}>
            <h1>Log File Processor</h1>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <label>
                    Hora:
                    <input
                        type="number"
                        min="0"
                        max="23"
                        value={customTime.startHour}
                        onChange={(e) => handleTimeInputChange(e, 'startHour')}
                        style={{ marginLeft: '0.5rem', width: '60px' }}
                    />
                </label>

                <label>
                    Minuto:
                    <input
                        type="number"
                        min="0"
                        max="59"
                        value={customTime.startMinute}
                        onChange={(e) => handleTimeInputChange(e, 'startMinute')}
                        style={{ marginLeft: '0.5rem', width: '60px' }}
                    />
                </label>

                <label>
                    Rango:
                    <input
                        type="number"
                        min="1"
                        max="60"
                        value={customTime.rangeTime}
                        onChange={(e) => handleTimeInputChange(e, 'rangeTime')}
                        style={{ marginLeft: '0.5rem', width: '60px' }}
                    />
                    <span style={{ marginLeft: '0.3rem' }}>min</span>
                </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <input
                        type="file"
                        accept=".log,.txt"
                        ref={fileInputRef1}
                        onChange={(e) => handleFileUpload(e, setIpCounts1)}
                    />
                    <span> Archivo 1</span>
                </div>

                <div>
                    <input
                        type="file"
                        accept=".log,.txt"
                        ref={fileInputRef2}
                        onChange={(e) => handleFileUpload(e, setIpCounts2)}
                    />
                    <span> Archivo 2</span>
                </div>

                {(ipCounts1.length > 0 || ipCounts2.length > 0) && (
                    <>
                        <button onClick={handleDownload}>Crear CSV combinado</button>
                        {downloadUrl && (
                            <div style={{ marginTop: '1rem' }}>
                                <a href={downloadUrl} download={downloadFileName}>
                                    Haz clic aquí para descargar el archivo
                                </a>
                            </div>
                        )}
                        <button onClick={resetAll}>Limpiar</button>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'row' }}>
                {renderTable(ipCounts1, 'Resultados Archivo 1')}
                {renderTable(ipCounts2, 'Resultados Archivo 2')}
            </div>
        </div>
    );
};

export default LogFileProcessor;
