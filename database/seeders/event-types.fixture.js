module.exports = async function (models) { 
    const eventTypes = [
        { name: 'ignition-on', priority: 'high' },
        { name: 'ignition-off', priority: 'high' },
        { name: 'device-running', priority: 'medium' },
        { name: 'device-stopped', priority: 'medium' },
        { name: 'device-idle', priority: 'low' },
        { name: 'connected', priority: 'medium' },
        { name: 'disconnected', priority: 'medium' },
    ];

    for (const eventType of eventTypes) {
        await models.EventType.findOrCreate({
            where: { name: eventType.name },
            defaults: {
                ...eventType,
                created_at: new Date(),
                updated_at: new Date()
            }
        });
    }
}