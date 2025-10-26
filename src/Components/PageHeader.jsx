import React from 'react';
import { motion } from 'framer-motion';

function PageHeader({ title, subtitle, icon: Icon, actions, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 bg-gradient-to-r from-emerald-400 to-cyan-500 dark:from-emerald-500 dark:to-cyan-600 text-white shadow-lg ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          {Icon && (
            <div className="shrink-0 p-3 rounded-xl bg-white/20 backdrop-blur">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base mt-1 text-white/90">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </motion.div>
  );
}

export default PageHeader;