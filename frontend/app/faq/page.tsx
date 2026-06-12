export  default function FAQ(){
    const faqs = [
        {
        q: "What does this app do?",
        a: "It syncs events from one Google Calendar to another while hiding details."
    },
    {
        q: "Does it copy event details?",
        a: "No. It simply displays 'Busy' in the particular time slot to protect privacy."
    },
    {
        q: "How often does sync run?",
        a: "Every 2 minutes automatically."
    },
    {
        q: "Can I stop syncing?",
        a: "Yes, you can toggle the workflow anytime."
    },
    
    ];
    return (
        <div className="max-w-3x1 mx-auto px-4 py-6">
            <h1 className="text-3x1 font-bold mb-6">FAQ</h1>
            <div className="space-y-4">
                {faqs.map((item,i)=> (
                    <div
                    key={i}
                    className="bg-white p-4 rounded-x1 shadow-sm border">
                        <h2 className="font-semibold text-gray-800">
                            {item.q}
                        </h2>
                        <p className="text-gray-600 mt-1 text-sm">{item.a}</p>
                        </div>
                ))}
            </div>
        </div>
    );
}