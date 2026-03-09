import React, { useState } from 'react';

interface FeedbackProps {
  onBack: () => void;
}

const Feedback: React.FC<FeedbackProps> = ({ onBack }) => {
    const [feedbackType, setFeedbackType] = useState('Suggestion');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            alert('Por favor, escreva sua mensagem.');
            return;
        }
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSubmitted(true);
            console.log({ feedbackType, message, email });
        }, 1500);
    };

    if (isSubmitted) {
        return (
            <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-screen">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                    <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Feedback Enviado!</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Obrigado por nos ajudar a melhorar o GlycoCare. Valorizamos sua opinião.</p>
                    <button onClick={onBack} className="w-full bg-teal-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-teal-600 transition duration-300">
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }
    
    const FeedbackTypeButton: React.FC<{ value: string; label: string; icon: string; }> = ({ value, label, icon }) => (
        <button
            type="button"
            onClick={() => setFeedbackType(value)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${feedbackType === value ? 'bg-teal-500 border-teal-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-teal-400'}`}
        >
            <i className={`fas ${icon} text-xl`}></i>
            <span className="font-semibold text-sm">{label}</span>
        </button>
    );

    const inputStyle = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="text-teal-500 hover:text-teal-700 flex items-center">
                    <i className="fas fa-arrow-left mr-2"></i> Voltar
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mx-auto">Feedback e Suporte</h1>
            </header>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qual o tipo do seu feedback?</label>
                        <div className="flex gap-2 sm:gap-4">
                            <FeedbackTypeButton value="Suggestion" label="Sugestão" icon="fa-lightbulb" />
                            <FeedbackTypeButton value="Issue" label="Problema" icon="fa-bug" />
                            <FeedbackTypeButton value="Question" label="Dúvida" icon="fa-question-circle" />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="message" className={labelStyle}>
                            Sua Mensagem
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className={inputStyle}
                            placeholder="Descreva sua sugestão ou problema em detalhes..."
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="email" className={labelStyle}>
                            Seu E-mail (Opcional)
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputStyle}
                            placeholder="Para que possamos entrar em contato"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                            </>
                        ) : 'Enviar Feedback'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Feedback;