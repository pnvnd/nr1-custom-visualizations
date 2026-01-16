import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';
import Plot from 'react-plotly.js';
import colorThemes from '../color_themes.json';

export default class SankeyDiagramVisualization extends React.Component {
    static propTypes = {
        queries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
        colorTheme: PropTypes.string,
    };

    transformData = (rawData) => {
        const transformedData = {
            nodes: [],
            links: [],
        };
        const nodeSet = new Set();
        const nodeIndexMap = {};

        rawData.forEach(({ metadata, data }) => {
            const facet1 = metadata.groups[1].value;
            const facet2 = metadata.groups[2].value;
            const value = data[0].y;

            if (!nodeIndexMap.hasOwnProperty(facet1)) {
                nodeIndexMap[facet1] = nodeSet.size;
                nodeSet.add(facet1);
            }
            if (!nodeIndexMap.hasOwnProperty(facet2)) {
                nodeIndexMap[facet2] = nodeSet.size;
                nodeSet.add(facet2);
            }

            transformedData.links.push({
                source: nodeIndexMap[facet1],
                target: nodeIndexMap[facet2],
                value: value,
            });
        });

        transformedData.nodes = Array.from(nodeSet).map(label => ({ label }));

        return transformedData;
    };

    render() {
        const { queries, color } = this.props;
        
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
        
                            const transformedData = this.transformData(data);

                            const themeColors = Array.isArray(colorThemes.discrete[color]) ? colorThemes.discrete[color] : colorThemes.discrete['Plotly'];
                            // Prepare data for Plotly Sankey Diagram
                            const plotlyData = [
                                {
                                    type: 'sankey',
                                    orientation: 'h',
                                    node: {
                                        pad: 10,
                                        thickness: 20,
                                        line: {
                                            color: 'black',
                                            width: 0.5,
                                        },
                                        label: transformedData.nodes.map(node => node.label),
                                        color: transformedData.nodes.map((_, i) => themeColors[i % themeColors.length]),
                                    },
                                    link: {
                                        source: transformedData.links.map(link => link.source),
                                        target: transformedData.links.map(link => link.target),
                                        value: transformedData.links.map(link => link.value),
                                    },
                                },
                            ];
                            
                            // Create the layout
                            const layout = {
                                font: {
                                    size: 10,
                                },
                                margin: {
                                    t: 5,
                                    b: 5,
                                    pad: 10
                                }
                            };

                            // Create the configuration object to remove Plotly logo
                            const config = {
                                displaylogo: false
                            };

                            return (
                                <Plot
                                    data={plotlyData}
                                    layout={layout}
                                    useResizeHandler
                                    style={{ width: '100%', height: '100%' }}
                                    config={config}
                                />
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
                SELECT count(*) FROM BrowserInteraction FACET previousGroupedUrl, targetGroupedUrl SINCE 24 HOURS AGO LIMIT MAX
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