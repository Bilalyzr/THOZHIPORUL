import React from 'react';
import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';

/**
 * EnhancedCard - A modern card component with glassmorphism effects
 * and smooth hover animations
 */
const EnhancedCard = ({
  children,
  title,
  subtitle,
  icon,
  value,
  unit,
  change,
  color = 'primary',
  elevation = 2,
  hoverLift = true,
  gradient = false,
  borderColor = null,
  ...props
}) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  const bgColorMap = {
    primary: `${theme.palette.primary.main}08`,
    secondary: `${theme.palette.secondary.main}08`,
    success: `${theme.palette.success.main}08`,
    warning: `${theme.palette.warning.main}08`,
    error: `${theme.palette.error.main}08`,
    info: `${theme.palette.info.main}08`,
  };

  const cardColor = colorMap[color] || colorMap.primary;
  const cardBgColor = bgColorMap[color] || bgColorMap.primary;

  return (
    <Card
      elevation={elevation}
      sx={{
        height: '100%',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderTop: borderColor ? `4px solid ${borderColor}` : undefined,
        background: gradient
          ? `linear-gradient(135deg, ${cardBgColor} 0%, rgba(255,255,255,0.9) 100%)`
          : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: borderColor ? undefined : '1px solid rgba(255,255,255,0.5)',
        ...(hoverLift && {
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: `0 16px 40px ${cardColor}20`,
            borderColor: borderColor ? cardColor : undefined,
          },
        }),
        ...props.sx,
      }}
      {...props}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {children || (
          <>
            {/* Header with icon */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                {title && (
                  <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                    {title}
                  </Typography>
                )}
                {value !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h4" fontWeight={800} color="text.primary">
                      {value}
                    </Typography>
                    {unit && (
                      <Typography variant="body2" color="text.secondary">
                        {unit}
                      </Typography>
                    )}
                  </Box>
                )}
                {change !== undefined && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: change.toString().includes('+') || change.toString().includes('growth') ? 'success.main' : 'error.main',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {change}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {icon && (
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${cardColor}15 0%, ${cardColor}05 100%)`,
                    color: cardColor,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1) rotate(5deg)',
                      background: cardColor,
                      '& svg': { color: 'white' },
                    },
                  }}
                >
                  {icon}
                </Box>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedCard;
