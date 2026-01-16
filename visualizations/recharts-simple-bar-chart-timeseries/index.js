import React from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';

// https://recharts.org/en-US/examples/SimpleBarChart
export default class SimpleBarChartTimeseriesVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
    };

    transformData = (rawData) => {
        const transformedData = [];
        const chartColors = {};

        // Helper function to convert hex color to RGB
        const hexToRgb = (hex) => {
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        };

        // Helper function to convert RGB back to hex
        const rgbToHex = (r, g, b) => {
            return (
                "#" +
                [r, g, b].map((x) => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                }).join("")
            );
        };

        // Helper function to invert a hex color
        const invertColor = (hex) => {
            const { r, g, b } = hexToRgb(hex);
            return rgbToHex(255 - r, 255 - g, 255 - b);
        };

        // Helper function to determine time range and format accordingly
        const getTimeRangeAndFormat = (timestamps) => {
            if (timestamps.length === 0) return null;

            const minTime = Math.min(...timestamps);
            const maxTime = Math.max(...timestamps);
            const rangeMs = maxTime - minTime;

            const HOUR = 60 * 60 * 1000;
            const DAY = 24 * HOUR;
            const WEEK = 7 * DAY;
            const MONTH = 30 * DAY;

            return {
                rangeMs,
                minTime,
                maxTime,
                isLessThanHour: rangeMs < HOUR,
                isLessThanDay: rangeMs < DAY,
                isLessThanWeek: rangeMs < WEEK,
                isLessThanMonth: rangeMs < MONTH
            };
        };

        // Helper function to format timestamp based on data range
        const formatTimestamp = (timestamp, timeRange) => {
            const date = new Date(timestamp);

            if (!timeRange) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            // Less than 1 hour: show time with seconds
            if (timeRange.isLessThanHour) {
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }

            // Less than 1 day: show time without seconds
            if (timeRange.isLessThanDay) {
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Less than 1 week: show day and time
            if (timeRange.isLessThanWeek) {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Less than 1 month: show month and day
            if (timeRange.isLessThanMonth) {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            }

            // More than 1 month: show month, day, and year
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        // First pass: collect all timestamps
        const allTimestamps = [];
        rawData.forEach(({ metadata, data }) => {
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                data.forEach(({ x }) => {
                    if (!allTimestamps.includes(x)) {
                        allTimestamps.push(x);
                    }
                });
            }
        });

        const timeRange = getTimeRangeAndFormat(allTimestamps);

        // Process timeseries data with facets
        // Each series represents a faceted value (e.g., appName)
        // Each data point in the series represents a timeseries bucket
        rawData.forEach(({ metadata, data }) => {
            if (metadata.name !== "Other" && metadata.name !== "Daylight saving time") {
                const facetName = metadata.groups[1]?.value || 'Value';
                chartColors[facetName] = invertColor(metadata.color);

                // Iterate through each timeseries data point
                data.forEach(({ x, y }) => {
                    const timestamp = formatTimestamp(x, timeRange);

                    // Find or create an entry for this timestamp
                    let entry = transformedData.find(e => e.name === timestamp && e.timestamp === x);
                    if (!entry) {
                        entry = { name: timestamp, timestamp: x };
                        transformedData.push(entry);
                    }

                    // Assign the value for this facet
                    entry[facetName] = y;
                });
            }
        });

        // Sort by timestamp to maintain chronological order
        transformedData.sort((a, b) => a.timestamp - b.timestamp);

        // Extract unique facet keys
        const facetKeys = transformedData
            .flatMap(entry => Object.keys(entry))
            .filter(key => key !== 'name' && key !== 'timestamp');
        const uniqueFacetKeys = Array.from(new Set(facetKeys));

        // Get Y-axis label from the first data series
        const yAxisLabel = rawData && rawData.length > 0 && rawData[0].metadata.groups[0].displayName
            ? rawData[0].metadata.groups[0].displayName
            : 'Y-Axis';

        return {
            data: transformedData,
            chartColors,
            yAxisLabel,
            uniqueFacetKeys
        };
    };

    // Format the tick presentation on the XAxis
    formatTick = (tickItem) => {
        return tickItem.toString();
    };

    // Formatter function to round values to two decimal places
    tooltipFormatter = (value) => {
        return value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    render() {
        const { queries } = this.props;
        
        if (!queries || !queries.length || !queries[0].accountId || !queries[0].query) {
            return <EmptyState />;
        }
        
        return (
            <AutoSizer>
                {({ width, height }) => (
                    <NrqlQuery
                        query={queries[0].query}
                        accountId={parseInt(queries[0].accountId)}
                        pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
                    >
                        {({ data, loading, error }) => {
                            if (loading) {
                                return <Spinner />;
                            }
        
                            if (error) {
                                return <ErrorState />;
                            }
        
                            const { data: transformedData, chartColors, yAxisLabel, uniqueFacetKeys } = this.transformData(data);
        
                            return (
                                <BarChart
                                    width={width-30}
                                    height={height-20}
                                    data={transformedData}
                                    margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
                                    barCategoryGap={'10%'}
                                >
                                    <XAxis dataKey="name" />
                                    <YAxis 
                                        tickFormatter={(value) => value.toLocaleString()}
                                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -35, style: { fontWeight: 'bold' } }} />
                                    <Tooltip formatter={this.tooltipFormatter} />
                                    <Legend />
                                    {uniqueFacetKeys.map(facet2 => (
                                        <Bar
                                            key={facet2}
                                            dataKey={facet2}
                                            fill={chartColors[facet2]}
                                            name={facet2}
                                        />
                                    ))}
                                </BarChart>
                            );
                        }}
                    </NrqlQuery>
                )}
            </AutoSizer>
        );
    }
}

const EmptyState = () => (
    <Card className="EmptyState">
        <CardBody className="EmptyState-cardBody">
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Please provide at least one NRQL query & account ID pair
            </HeadingText>
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
                type={HeadingText.TYPE.HEADING_4}
            >
                An example NRQL query you can try is:
            </HeadingText>
            <code>
                SELECT count(*) FROM Transaction FACET appName SINCE 1 week ago LIMIT MAX TIMESERIES 1 day
            </code>
        </CardBody>
    </Card>
);

const ErrorState = () => (
    <Card className="ErrorState">
        <CardBody className="ErrorState-cardBody">
            <HeadingText
                className="ErrorState-headingText"
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Oops! Something went wrong.
            </HeadingText>
        </CardBody>
    </Card>
);