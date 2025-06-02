import { motion } from 'framer-motion';
import { Check, FileText, FileTextIcon, Files } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export function SummaryLevelSelector({ value, onChange, disabled = false }) {
    const { t } = useTranslation();
    
    const summaryLevels = [
        {
            id: 'none',
            name: t('summaryLevels.none.name'),
            description: t('summaryLevels.none.description'),
            icon: FileText,
            color: 'gray'
        },
        {
            id: 'concise',
            name: t('summaryLevels.concise.name'),
            description: t('summaryLevels.concise.description'),
            icon: FileTextIcon,
            color: 'blue',
            recommended: true
        },
        {
            id: 'detailed',
            name: t('summaryLevels.detailed.name'),
            description: t('summaryLevels.detailed.description'),
            icon: Files,
            color: 'purple'
        }
    ];
    
    return (
        <div className="grid md:grid-cols-3 gap-4">
            {summaryLevels.map((level) => {
                const isSelected = value === level.id;
                const Icon = level.icon;
                
                return (
                    <motion.button
                        key={level.id}
                        whileHover={{ scale: disabled ? 1 : 1.02 }}
                        whileTap={{ scale: disabled ? 1 : 0.98 }}
                        onClick={() => !disabled && onChange(level.id)}
                        disabled={disabled}
                        className={cn(
                            'relative p-6 rounded-xl border-2 transition-all text-left',
                            isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700',
                            !disabled && !isSelected && 'hover:border-gray-300 dark:hover:border-gray-600',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {level.recommended && (
                            <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                                {t('summaryLevels.recommended')}
                            </span>
                        )}
                        
                        <div className="flex items-start justify-between mb-4">
                            <div className={cn(
                                'p-3 rounded-lg',
                                isSelected ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'
                            )}>
                                <Icon className={cn(
                                    'h-6 w-6',
                                    isSelected ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
                                )} />
                            </div>
                            {isSelected && (
                                <Check className="h-5 w-5 text-primary-600" />
                            )}
                        </div>
                        
                        <h3 className={cn(
                            'font-semibold mb-1',
                            isSelected ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-white'
                        )}>
                            {level.name}
                        </h3>
                        <p className={cn(
                            'text-sm',
                            isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
                        )}>
                            {level.description}
                        </p>
                    </motion.button>
                );
            })}
        </div>
    );
}